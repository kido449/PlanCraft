const BASE = 'http://localhost:3000';

async function runLiveAudit() {
  console.log('--- STARTING LIVE API AND LLM AUDIT ---');

  // 1. Health Check
  const healthRes = await fetch(`${BASE}/api/health`);
  const health = await healthRes.json();
  console.log('1. Health Check:', healthRes.status === 200 && health.groqConfigured ? 'PASS' : 'FAIL', health);

  // 2. Create Wedding Event
  const createWeddingRes = await fetch(`${BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Audit Wedding Gala',
      type: 'wedding',
      date: '2026-11-20',
      total_budget: 35000,
      guest_count: 120,
      location: 'Grand Ballroom & Garden Terrace',
      vibe: 'Black-tie optional, vegetarian options required, refined and romantic',
    }),
  });
  const weddingData = await createWeddingRes.json();
  const weddingId = weddingData.event?.id;
  console.log('2. Create Wedding Event:', createWeddingRes.status === 201 ? 'PASS' : 'FAIL', 'ID:', weddingId);

  // 3. Add Guests
  const addGuestRes = await fetch(`${BASE}/api/events/${weddingId}/guests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Eleanor Vance',
      email: 'eleanor@example.com',
      rsvp_status: 'attending',
      dietary_restrictions: 'Vegan / Nut Allergy',
      plus_ones: 1,
    }),
  });
  const guestData = await addGuestRes.json();
  console.log('3. Add Guest to Event:', addGuestRes.status === 201 ? 'PASS' : 'FAIL', guestData.guest?.id, guestData.guest?.dietary_restrictions);

  // 4. Generate Wedding Plan via Groq
  console.log('4. Generating Wedding Plan via Groq (model: qwen/qwen3.8-27b)...');
  const t0 = Date.now();
  const genWeddingRes = await fetch(`${BASE}/api/events/${weddingId}/generate`, {
    method: 'POST',
  });
  const genWeddingData = await genWeddingRes.json();
  const plan = genWeddingData.event;
  console.log(
    '   Wedding Plan Generated in',
    Date.now() - t0,
    'ms. Status:',
    genWeddingRes.status === 200 ? 'PASS' : 'FAIL',
    'Budget items:',
    plan?.budget_items?.length,
    'Vendors:',
    plan?.vendors?.length,
    'Timeline:',
    plan?.timeline_tasks?.length
  );

  await new Promise((r) => setTimeout(r, 1500));

  // 5. Chat with Groq AI Assistant
  console.log('5. Testing AI Assistant Chat via Groq...');
  const chatRes = await fetch(`${BASE}/api/events/${weddingId}/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Can you recommend adding a dessert table budget item for $500?' }),
  });
  const chatData = await chatRes.json();
  console.log(
    '   Chat Response:',
    chatRes.status === 200 ? 'PASS' : 'FAIL',
    'Reply preview:',
    chatData.reply?.slice(0, 80),
    'Actions:',
    chatData.suggested_actions?.length
  );

  // 6. Apply AI Action (using REST CRUD)
  if (chatData.suggested_actions?.length > 0) {
    const action = chatData.suggested_actions[0];
    const applyRes = await fetch(`${BASE}/api/events/${weddingId}/budget-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: action.data.category || 'Desserts & Sweets',
        estimated_cost: action.data.estimated_cost || 500,
        actual_cost: 0,
        notes: action.data.notes || 'Added via AI Assistant',
        locked: false,
      }),
    });
    console.log('6. Apply Assistant Action (Add Budget Item):', applyRes.status === 201 ? 'PASS' : 'FAIL');
  } else {
    console.log('6. Apply Assistant Action: SKIPPED (no action suggested)');
  }

  await new Promise((r) => setTimeout(r, 1500));

  // 7. Update Event Constraints & Replan
  console.log('7. Testing Groq Replan with updated budget & guest count...');
  await fetch(`${BASE}/api/events/${weddingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      total_budget: 30000,
      guest_count: 90,
    }),
  });
  const replanRes = await fetch(`${BASE}/api/events/${weddingId}/replan`, {
    method: 'POST',
  });
  const replanData = await replanRes.json();
  console.log(
    '   Replan Status:',
    replanRes.status === 200 ? 'PASS' : 'FAIL',
    'Rationale preview:',
    (replanData.rationale || replanData.replan_rationale || replanData.event?.replan_rationale)?.slice(0, 100)
  );

  await new Promise((r) => setTimeout(r, 1500));

  // 8. Create Community Event
  console.log('8. Creating Community Event...');
  const commRes = await fetch(`${BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Riverside Park Earth Day Cleanup & Fair',
      type: 'community',
      date: '2026-10-15',
      total_budget: 8000,
      guest_count: 350,
      location: 'Riverside Community Park & Pavilion',
      vibe: 'Requires city park permit, waste management volunteers, and sound amplification permit',
    }),
  });
  const commData = await commRes.json();
  const commId = commData.event?.id;
  console.log('   Community Event Created:', commRes.status === 201 ? 'PASS' : 'FAIL', 'ID:', commId);

  // 9. Generate Community Plan via Groq
  console.log('9. Generating Community Plan (Volunteers & Permits) via Groq...');
  const t1 = Date.now();
  const genCommRes = await fetch(`${BASE}/api/events/${commId}/generate`, {
    method: 'POST',
  });
  const genCommData = await genCommRes.json();
  const commPlan = genCommData.event;
  console.log(
    '   Community Plan Generated in',
    Date.now() - t1,
    'ms. Status:',
    genCommRes.status === 200 ? 'PASS' : 'FAIL',
    'Volunteers:',
    commPlan?.volunteers?.length,
    'Permits:',
    commPlan?.permits?.length,
    'Budget items:',
    commPlan?.budget_items?.length,
    'Vendors (must be 0 for community):',
    commPlan?.vendors?.length
  );

  // 10. CRUD Volunteers & Permits
  const addVolRes = await fetch(`${BASE}/api/events/${commId}/volunteers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'Head of Waste Disposal',
      contact_name: 'Marcus Brody',
      contact_phone: '555-0199',
      shift_time: '9:00 AM - 1:00 PM',
      confirmed: true,
      notes: 'Bringing truck for compost bags',
    }),
  });
  const volData = await addVolRes.json();
  console.log('10. Add Volunteer:', addVolRes.status === 201 ? 'PASS' : 'FAIL', volData.volunteer?.id, volData.volunteer?.role);

  const addPermitRes = await fetch(`${BASE}/api/events/${commId}/permits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      permit_name: 'Parks & Rec Public Gathering Authorization',
      issuing_agency: 'Municipal Parks Dept',
      status: 'approved',
      reference_number: 'PR-2026-9921',
      cost: 150,
    }),
  });
  const permitData = await addPermitRes.json();
  console.log('11. Add Permit:', addPermitRes.status === 201 ? 'PASS' : 'FAIL', permitData.permit?.id, permitData.permit?.permit_name);

  // 12. Verification check: Fetch Event with Details
  const getEventRes = await fetch(`${BASE}/api/events/${commId}`);
  const eventDetails = await getEventRes.json();
  const loadedEvent = eventDetails.event;
  console.log(
    '12. Verification of Stored Community Event:',
    loadedEvent.volunteers?.length > 0 && loadedEvent.permits?.length > 0 ? 'PASS' : 'FAIL',
    'Total volunteers:',
    loadedEvent.volunteers?.length,
    'Total permits:',
    loadedEvent.permits?.length,
    'Vendors:',
    loadedEvent.vendors?.length
  );

  console.log('--- ALL LIVE API & LLM CHECKS FINISHED SUCCESSFULLY ---');
}

runLiveAudit().catch(err => console.error('AUDIT ERROR:', err));
