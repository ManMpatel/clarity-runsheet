export default function Terms() {
  return (
    <div className='max-w-3xl mx-auto px-6 py-12'>
      <h1 className='text-3xl font-bold text-fg mb-2'>Terms of Service</h1>
      <p className='text-sm text-fg-subtle mb-8'>Last updated: 24 June 2026</p>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>1. Acceptance of Terms</h2>
        <p className='text-sm text-fg-muted leading-relaxed'>By accessing or using Clarity Fleet, you agree to be bound by these Terms of Service. If you do not agree, do not use our service. Clarity Fleet is operated by Man Patel (ABN 52 871 904 331), Auburn, New South Wales, Australia.</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>2. Description of Service</h2>
        <p className='text-sm text-fg-muted leading-relaxed'>Clarity Fleet provides GPS fleet tracking software accessible via web dashboard and mobile application. The service includes real-time vehicle tracking, trip history, driver behaviour monitoring, geofence alerts, FBT logbook, and maintenance scheduling. Hardware (Teltonika GPS trackers) must be purchased separately and installed in your vehicles.</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>3. Subscription and Payment</h2>
        <ul className='text-sm text-fg-muted space-y-2 list-disc list-inside'>
          <li>Clarity Fleet charges $19.99 AUD per vehicle per month</li>
          <li>Subscriptions are billed monthly via Stripe</li>
          <li>Billing begins on the date of subscription and renews monthly on the same date</li>
          <li>All prices include GST where applicable</li>
          <li>There are no lock-in contracts — you may cancel at any time</li>
          <li>No refunds are provided for partial months</li>
          <li>Enterprise customers may be billed via direct debit under a separate agreement</li>
        </ul>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>4. Cancellation</h2>
        <p className='text-sm text-fg-muted leading-relaxed'>You may cancel your subscription at any time through the Billing section of your account settings or by contacting us at man@clarity-software.com.au. Upon cancellation, your access will continue until the end of the current billing period.</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>5. Acceptable Use</h2>
        <p className='text-sm text-fg-muted leading-relaxed mb-3'>You agree not to:</p>
        <ul className='text-sm text-fg-muted space-y-2 list-disc list-inside'>
          <li>Use Clarity Fleet to track individuals without their knowledge or consent</li>
          <li>Use the service for any unlawful purpose</li>
          <li>Attempt to reverse engineer or compromise our systems</li>
          <li>Share your account credentials with unauthorised parties</li>
          <li>Use the remote engine cut feature in a manner that endangers safety</li>
        </ul>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>6. Driver Consent</h2>
        <p className='text-sm text-fg-muted leading-relaxed'>You are responsible for ensuring that all drivers whose vehicles are tracked have been informed of and consented to GPS monitoring in accordance with Australian privacy laws and workplace regulations. Clarity Fleet accepts no liability for failure to obtain appropriate consent.</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>7. Remote Engine Cut</h2>
        <p className='text-sm text-fg-muted leading-relaxed'>The remote engine cut feature must only be used when the vehicle is stationary and in a safe location. You must never use this feature while the vehicle is in motion. Clarity Fleet accepts no liability for any damage, injury, or loss resulting from misuse of the engine cut feature.</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>8. Service Availability</h2>
        <p className='text-sm text-fg-muted leading-relaxed'>We aim to provide 99.9% uptime but do not guarantee uninterrupted service. Tracking accuracy depends on GPS signal strength and cellular network coverage. We are not liable for service interruptions caused by third-party providers including cellular networks, GPS satellites, or cloud infrastructure.</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>9. Limitation of Liability</h2>
        <p className='text-sm text-fg-muted leading-relaxed'>To the maximum extent permitted by Australian law, Clarity Fleet's liability is limited to the amount you paid in the 30 days preceding the claim. We are not liable for indirect, incidental, or consequential damages including loss of profit, data, or business.</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>10. Intellectual Property</h2>
        <p className='text-sm text-fg-muted leading-relaxed'>All software, design, and content within Clarity Fleet is owned by Man Patel. You are granted a non-exclusive licence to use the service for your business purposes only. You may not copy, reproduce, or redistribute any part of the service.</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>11. Governing Law</h2>
        <p className='text-sm text-fg-muted leading-relaxed'>These terms are governed by the laws of New South Wales, Australia. Any disputes will be subject to the exclusive jurisdiction of the courts of New South Wales.</p>
      </section>

      <section className='mb-8'>
        <h2 className='text-lg font-semibold text-fg mb-3'>12. Contact</h2>
        <div className='text-sm text-fg-muted'>
          <p className='font-medium'>Man Patel — Clarity Fleet</p>
          <p>Email: man@clarity-software.com.au</p>
          <p>Phone: 0481 864 170</p>
          <p>ABN: 52 871 904 331</p>
        </div>
      </section>
    </div>
  )
}