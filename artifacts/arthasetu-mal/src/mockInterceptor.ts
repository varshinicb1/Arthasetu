const originalFetch = window.fetch.bind(window);

let transactions: any[] = [];
let networkMode = "ONLINE";

window.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : (input instanceof Request ? input.url : "");

  // Intercept ONLY API calls, let vite assets pass through
  if (!url.includes("/api/")) {
    return originalFetch(input, init);
  }

  if (url.includes("/api/transactions") && init?.method === "POST") {
    // Generate a new transaction mock
    const bodyStr = init.body as string;
    let body: any = {};
    if (bodyStr) {
      try { body = JSON.parse(bodyStr); } catch (e) {}
    }
    const isFraud = Number(body.amount) > 50000;
    
    // Simulate high/low trust scores
    const score = isFraud ? 18 : Math.floor(Math.random() * 10) + 85;

    const newTxn = {
      txn_id: "TXN-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      customer_id: body.customer_id || "CUST-001",
      customer_name: body.customer_name || "Priya Sharma",
      merchant_id: body.merchant_id || "MERCH-001",
      merchant_name: body.merchant_name || "Demo Merchant",
      amount: Number(body.amount) || 1500,
      status: networkMode === "OFFLINE" ? "UNCONFIRMED" : "SUCCESS",
      confidence_score: score,
      confidence_level: score >= 80 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW",
      proof_strength: "HIGH",
      fraud_flags: isFraud ? ["High value anomaly", "Location mismatch"] : [],
      network_mode: networkMode,
      merchant_decision: "PENDING",
      timestamp: new Date().toISOString(),
      score_breakdown: [
        { factor: "Device ID Match", impact: "+15", description: "Known device" },
        { factor: "Behavior Analytics", impact: isFraud ? "-40" : "+20", description: isFraud ? "Anomalous interaction speed" : "Typical usage pattern" }
      ]
    };
    transactions = [newTxn, ...transactions];

    return new Response(JSON.stringify(newTxn), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (url.includes("/api/transactions") && (!init?.method || init?.method === "GET")) {
    return new Response(JSON.stringify(transactions), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (url.includes("/api/merchant/decide")) {
    const bodyStr = init?.body as string;
    let decision = "ACCEPTED";
    try {
      decision = JSON.parse(bodyStr).decision;
    } catch(e) {}
    
    // Extract txnId from URL e.g. /api/merchant/decide/{txnId}
    const parts = url.split("/");
    const txnId = parts[parts.length - 1];

    const txn = transactions.find(t => t.txn_id === txnId);
    if (txn) {
      txn.merchant_decision = decision;
      if (decision === "REJECTED") txn.status = "REJECTED";
      if (decision === "ACCEPTED") txn.status = "ACCEPTED";
      if (decision === "ACCEPTED_WITH_RISK") txn.status = "ACCEPTED_WITH_RISK";
    }
    return new Response(JSON.stringify(txn || {}), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (url.includes("/api/network/status") && init?.method === "PUT") {
    const bodyStr = init?.body as string;
    let mode = "ONLINE";
    try { mode = JSON.parse(bodyStr).mode; } catch(e) {}
    networkMode = mode;
    return new Response(JSON.stringify({ mode }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (url.includes("/api/network/status") && (!init?.method || init?.method === "GET")) {
    return new Response(JSON.stringify({ mode: networkMode }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // Mock profile API returning empty/default wrapper
  if (url.includes("/api/profiles/")) {
    return new Response(JSON.stringify({ trust_score: 85 }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (url.includes("/api/simulation/run-demo")) {
    return new Response(JSON.stringify({ success: true, message: "Demo initialized" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (url.includes("/api/transactions/sync")) {
    return new Response(JSON.stringify({ synced: 1, message: "Synced" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // All other API queries return 200 OK empty array or object
  return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
};
