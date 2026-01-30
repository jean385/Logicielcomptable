const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe");

admin.initializeApp();
const db = admin.firestore();

/**
 * Retourne une instance Stripe configurée
 */
function getStripe() {
  return stripe(process.env.STRIPE_SECRET_KEY);
}

/**
 * Retourne l'URL de base de l'application
 */
function getAppUrl() {
  return "https://logicielcomptable-6487c.web.app";
}

// ============================================================
// 1. createCheckoutSession — Callable (authenticated)
//    Crée une session Stripe Checkout pour l'abonnement mensuel
// ============================================================
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  // Vérifier l'authentification
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Vous devez être connecté pour vous abonner."
    );
  }

  const uid = context.auth.uid;
  const email = context.auth.token.email;
  const stripeInstance = getStripe();

  try {
    // Chercher ou créer le client Stripe
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    let stripeCustomerId = userDoc.exists ? userDoc.data().stripeCustomerId : null;

    if (!stripeCustomerId) {
      // Créer un nouveau client Stripe
      const customer = await stripeInstance.customers.create({
        email: email,
        metadata: { firebaseUID: uid },
      });
      stripeCustomerId = customer.id;

      // Sauvegarder l'ID dans Firestore
      await userRef.set(
        { stripeCustomerId: stripeCustomerId },
        { merge: true }
      );
    }

    // Créer la session Checkout
    const session = await stripeInstance.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: getAppUrl() + "/?payment=success",
      cancel_url: getAppUrl() + "/?payment=cancel",
    });

    return { url: session.url };
  } catch (error) {
    console.error("Erreur createCheckoutSession:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erreur lors de la création de la session de paiement."
    );
  }
});

// ============================================================
// 2. createPortalSession — Callable (authenticated)
//    Crée une session Stripe Billing Portal
// ============================================================
exports.createPortalSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Vous devez être connecté."
    );
  }

  const uid = context.auth.uid;
  const stripeInstance = getStripe();

  try {
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists || !userDoc.data().stripeCustomerId) {
      throw new functions.https.HttpsError(
        "not-found",
        "Aucun abonnement trouvé."
      );
    }

    const stripeCustomerId = userDoc.data().stripeCustomerId;

    const session = await stripeInstance.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: getAppUrl() + "/",
    });

    return { url: session.url };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error("Erreur createPortalSession:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erreur lors de la création du portail de gestion."
    );
  }
});

// ============================================================
// 3. stripeWebhook — HTTP function (Stripe signature)
//    Gère les événements Stripe
// ============================================================
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const stripeInstance = getStripe();
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Erreur vérification signature webhook:", err.message);
    res.status(400).send("Webhook signature verification failed.");
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log("Événement non géré:", event.type);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Erreur traitement webhook:", error);
    res.status(500).send("Erreur interne.");
  }
});

// ============================================================
// Handlers pour les événements Stripe
// ============================================================

/**
 * checkout.session.completed
 * L'utilisateur a complété le paiement Checkout
 */
async function handleCheckoutCompleted(session) {
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  // Trouver l'utilisateur Firebase par stripeCustomerId
  const usersSnapshot = await db
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.error("Aucun utilisateur trouvé pour le client Stripe:", customerId);
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  const stripeInstance = getStripe();

  // Récupérer les détails de l'abonnement
  const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);

  await userDoc.ref.update({
    subscription: {
      status: "active",
      stripeSubscriptionId: subscriptionId,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  console.log("Abonnement activé pour:", userDoc.id);
}

/**
 * customer.subscription.updated
 * L'abonnement a été modifié (renouvellement, changement de plan, etc.)
 */
async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;

  const usersSnapshot = await db
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.error("Aucun utilisateur trouvé pour le client Stripe:", customerId);
    return;
  }

  const userDoc = usersSnapshot.docs[0];

  await userDoc.ref.update({
    "subscription.status": subscription.status,
    "subscription.currentPeriodEnd": subscription.current_period_end,
    "subscription.cancelAtPeriodEnd": subscription.cancel_at_period_end,
  });

  console.log("Abonnement mis à jour pour:", userDoc.id, "→", subscription.status);
}

/**
 * customer.subscription.deleted
 * L'abonnement a été annulé
 */
async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;

  const usersSnapshot = await db
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.error("Aucun utilisateur trouvé pour le client Stripe:", customerId);
    return;
  }

  const userDoc = usersSnapshot.docs[0];

  await userDoc.ref.update({
    "subscription.status": "canceled",
    "subscription.cancelAtPeriodEnd": false,
  });

  console.log("Abonnement annulé pour:", userDoc.id);
}

/**
 * invoice.payment_failed
 * Le paiement d'une facture a échoué
 */
async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;

  const usersSnapshot = await db
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.error("Aucun utilisateur trouvé pour le client Stripe:", customerId);
    return;
  }

  const userDoc = usersSnapshot.docs[0];

  await userDoc.ref.update({
    "subscription.status": "past_due",
  });

  console.log("Paiement échoué pour:", userDoc.id);
}
