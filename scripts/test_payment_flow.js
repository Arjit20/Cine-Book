(async () => {
  try {
    const base = 'https://localhost:3000';
    const showId = '6912dae809c066f26fd2be17'; // known showId from logs
    // Try a sequence of candidate seats until one succeeds
    const candidateSeats = ['H10','H9','H8','G10','G9','G8','F10','F9','E10','D10','C10','B10','A10'];
    let seats = null;
    const ts = Date.now();
    const userEmail = `testbot+${ts}@example.com`;

    console.log('Starting test: booking -> select payment -> confirm payment');
    console.log('Booking:', { showId, seats, userEmail });

    // Register a temporary user so the booking endpoint can find the user by email
    console.log('\nRegistering test user:', userEmail);
    const regBody = new URLSearchParams();
    regBody.append('name', 'Test Bot');
    regBody.append('email', userEmail);
    regBody.append('password', 'Password123!');

    let cookieHeader = null;
    try {
      const regResp = await fetch(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: regBody.toString(),
        redirect: 'manual'
      });
      console.log('Registration request sent (status ' + regResp.status + ').');
      // Capture cookie set by server
      cookieHeader = regResp.headers.get('set-cookie') || regResp.headers.get('Set-Cookie');
      if (cookieHeader) console.log('Captured cookie header.');
    } catch (regErr) {
      console.warn('Registration request failed (continuing to booking):', regErr.message || regErr);
    }

    // Loop through candidate seats until booking succeeds
    let bookData = null;
    for (let i = 0; i < candidateSeats.length; i++) {
      seats = [candidateSeats[i]];
      console.log('\nAttempting booking for seats:', seats);
      const bookResp = await fetch(`${base}/seats/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
        body: JSON.stringify({ showId, seats, userEmail })
      });

      bookData = await bookResp.json();
      console.log('/seats/book response for', seats, JSON.stringify(bookData));
      if (bookData.success) break;
      // if unavailableSeats returned, try next candidate
    }

    if (!bookData || !bookData.success) {
      console.error('All booking attempts failed - aborting test');
      return;
    }

    const bookingId = (bookData.booking && bookData.booking._id) || bookData.bookingId || (bookData.booking && bookData.booking.id) || null;
    if (!bookingId) {
      console.error('No bookingId returned by server, aborting');
      return;
    }

    console.log('\nSelecting payment method: qr_payment for bookingId', bookingId);
      const selectResp = await fetch(`${base}/payment/select-method`, {
      method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      body: JSON.stringify({ bookingId, paymentMethod: 'qr_payment' })
    });
    const selectData = await selectResp.json();
    console.log('\n/payment/select-method response:');
    console.log(JSON.stringify(selectData, null, 2));

    if (!selectData.success) {
      console.error('Selecting payment method failed - aborting');
      return;
    }

    console.log('\nConfirming payment for bookingId', bookingId);
    const confirmResp = await fetch(`${base}/payment/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      body: JSON.stringify({ bookingId })
    });
    const confirmData = await confirmResp.json();
    console.log('\n/payment/confirm response:');
    console.log(JSON.stringify(confirmData, null, 2));

    if (confirmData.success) {
      console.log('\nTest completed: payment confirmed.');
    } else {
      console.error('\nPayment confirmation failed');
    }
  } catch (err) {
    console.error('Test script error:', err);
  }
})();
