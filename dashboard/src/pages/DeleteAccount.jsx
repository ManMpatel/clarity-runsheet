export default function DeleteAccount() {
  return (
    <div style={{ maxWidth: 680, margin: '60px auto', padding: '0 24px', fontFamily: 'sans-serif', color: '#111' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Delete Your Account</h1>
      <p style={{ color: '#555', marginBottom: 32 }}>Clarity Fleet — clarity-software.com.au</p>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>How to request account deletion</h2>
      <p style={{ lineHeight: 1.7, marginBottom: 16 }}>
        To request deletion of your Clarity Fleet account and all associated data, send an email to:
      </p>
      <p style={{ marginBottom: 32 }}>
        <a href="mailto:man@clarity-software.com.au" style={{ color: '#2563eb', fontWeight: 600 }}>
          man@clarity-software.com.au
        </a>
      </p>
      <p style={{ lineHeight: 1.7, marginBottom: 32 }}>
        Include your registered email address in the request. We will process your request within 30 days and confirm
        by email once complete.
      </p>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>What gets deleted</h2>
      <ul style={{ lineHeight: 2, paddingLeft: 20, marginBottom: 32 }}>
        <li>Your account and login credentials</li>
        <li>Your company profile and fleet configuration</li>
        <li>All vehicle and driver records</li>
        <li>All trip history and GPS data</li>
        <li>All alert history and settings</li>
        <li>Push notification tokens</li>
      </ul>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>What may be retained</h2>
      <ul style={{ lineHeight: 2, paddingLeft: 20, marginBottom: 32 }}>
        <li>Billing records and invoices — retained for 7 years for tax compliance (Australian ATO requirements)</li>
        <li>Anonymised, aggregated usage data that cannot identify you</li>
      </ul>

      <p style={{ color: '#555', fontSize: 14 }}>
        For questions, contact us at man@clarity-software.com.au
      </p>
    </div>
  );
}