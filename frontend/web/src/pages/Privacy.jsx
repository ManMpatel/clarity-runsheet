export default function Privacy() {
  return (
    <div className='max-w-3xl mx-auto px-6 py-12'>
      <h1 className='text-3xl font-bold text-fg mb-2'>Privacy Policy</h1>
      <p className='text-sm text-fg-subtle mb-8'>Last updated: 24 June 2026</p>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>1. About Clarity Fleet</h2>
        <p className='text-sm text-fg-muted leading-relaxed'>Clarity Fleet is a GPS fleet tracking service operated by Man Patel (ABN 52 871 904 331), based in Auburn, New South Wales, Australia. We provide real-time vehicle tracking, trip history, driver behaviour monitoring, and fleet management tools for Australian small businesses.</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>2. Information We Collect</h2>
        <p className='text-sm text-fg-muted leading-relaxed mb-3'>We collect the following information when you use Clarity Fleet:</p>
        <ul className='text-sm text-fg-muted space-y-2 list-disc list-inside'>
          <li>Account information — name, email address, company name</li>
          <li>Vehicle location data — GPS coordinates, speed, heading, and ignition status transmitted by the Teltonika tracking device installed in your vehicle</li>
          <li>Trip data — start and end locations, distance travelled, duration</li>
          <li>Driver behaviour data — speeding events, harsh braking, rapid acceleration</li>
          <li>Device information — IMEI numbers of tracking hardware</li>
          <li>Payment information — processed securely by Stripe; we do not store card details</li>
          <li>Usage data — how you interact with the Clarity Fleet dashboard and mobile app</li>
        </ul>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>3. How We Use Your Information</h2>
        <ul className='text-sm text-fg-muted space-y-2 list-disc list-inside'>
          <li>To provide real-time GPS tracking and fleet management services</li>
          <li>To generate trip history, FBT logbooks, and driver behaviour reports</li>
          <li>To send alerts and notifications about your vehicles</li>
          <li>To process subscription payments via Stripe</li>
          <li>To provide customer support</li>
          <li>To improve our services</li>
        </ul>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>4. Location Data</h2>
        <p className='text-sm text-fg-muted leading-relaxed'>Clarity Fleet collects precise GPS location data from tracking devices installed in your vehicles. This data is transmitted via cellular network and stored securely on our servers. Location data is only accessible to authorised users within your organisation. We do not sell location data to third parties.</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>5. Data Sharing</h2>
        <p className='text-sm text-fg-muted leading-relaxed mb-3'>We do not sell your personal information. We may share data with:</p>
        <ul className='text-sm text-fg-muted space-y-2 list-disc list-inside'>
          <li><strong>Stripe</strong> — for payment processing</li>
          <li><strong>Mapbox</strong> — for mapping and reverse geocoding</li>
          <li><strong>1GLOBAL</strong> — for SIM card connectivity</li>
          <li><strong>Resend</strong> — for transactional email delivery</li>
          <li>Law enforcement or government agencies when required by Australian law</li>
        </ul>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>6. Data Storage and Security</h2>
        <p className='text-sm text-fg-muted leading-relaxed'>Your data is stored on secure servers located in Sydney, Australia (DigitalOcean SYD1). We use industry-standard encryption for data in transit (HTTPS/TLS) and at rest. Access to data is restricted to authorised personnel only.</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>7. Data Retention</h2>
        <p className='text-sm text-fg-muted leading-relaxed'>We retain your data for as long as your account is active. Telemetry data (GPS location history) is retained for 12 months. If you cancel your subscription, your data will be deleted within 30 days upon request.</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>8. Your Rights</h2>
        <p className='text-sm text-fg-muted leading-relaxed mb-3'>Under the Australian Privacy Act 1988, you have the right to:</p>
        <ul className='text-sm text-fg-muted space-y-2 list-disc list-inside'>
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your data</li>
          <li>Opt out of marketing communications</li>
        </ul>
        <p className='text-sm text-fg-muted leading-relaxed mt-3'>To exercise these rights, contact us at man@clarity-software.com.au</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>9. Cookies</h2>
        <p className='text-sm text-fg-muted leading-relaxed'>Clarity Fleet uses essential cookies and local storage to maintain your login session. We do not use advertising or tracking cookies.</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>10. Contact Us</h2>
        <p className='text-sm text-fg-muted leading-relaxed'>If you have any questions about this privacy policy or how we handle your data, please contact:</p>
        <div className='mt-3 text-sm text-fg-muted'>
          <p className='font-medium'>Man Patel — Clarity Fleet</p>
          <p>Email: man@clarity-software.com.au</p>
          <p>Phone: 0481 864 170</p>
          <p>ABN: 52 871 904 331</p>
        </div>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>11. Changes to This Policy</h2>
        <p className='text-sm text-fg-muted leading-relaxed'>We may update this privacy policy from time to time. We will notify you of any significant changes by email or through the Clarity Fleet dashboard.</p>
      </section>
    </div>
  )
}