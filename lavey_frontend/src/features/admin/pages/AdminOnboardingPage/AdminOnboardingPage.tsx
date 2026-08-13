import { useEffect, useState } from 'react';
import { apiConfig } from '@/config/api.config';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import './AdminOnboardingPage.css';

interface InviteDetails {
  email: string;
  full_name: string;
  admin_employee_roles?: { name?: string; department?: string } | { name?: string; department?: string }[];
}

export function AdminOnboardingPage({ onComplete }: { onComplete: () => void }) {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState('');
  const [documentStatus, setDocumentStatus] = useState('');
  const [documentReady, setDocumentReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ phone: '', idNumber: '', address: '', password: '', confirmPassword: '' });

  useEffect(() => {
    fetch(`${apiConfig.baseUrl}${API_ENDPOINTS.admin.adminInvite}?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const body = await response.json() as { data?: InviteDetails; message?: string };
        if (!response.ok || !body.data) throw new Error(body.message || 'Invalid onboarding link.');
        setInvite(body.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load invitation.'));
  }, [token]);

  const analyzeDocument = async (file: File | null) => {
    if (!file) return;
    setDocumentStatus('Reading and comparing your document…');
    setError('');
    const data = new FormData();
    data.append('token', token);
    data.append('document', file);
    try {
      const response = await fetch(`${apiConfig.baseUrl}/admin/auth/invite/analyze-document`, { method: 'POST', body: data });
      const body = await response.json() as { data?: { comparisonStatus: string; comparisonReason: string }; message?: string };
      if (!response.ok || !body.data) throw new Error(body.message || 'Document analysis failed.');
      setDocumentReady(true);
      setDocumentStatus(`${body.data.comparisonStatus === 'matched' ? '✓' : '⚠'} ${body.data.comparisonReason}`);
    } catch (err) {
      setDocumentStatus('');
      setError(err instanceof Error ? err.message : 'Could not analyze document.');
    }
  };

  const complete = async () => {
    if (!documentReady) return setError('Upload your identity document before continuing.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${apiConfig.baseUrl}${API_ENDPOINTS.admin.completeAdminInvite}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: form.password, phone: form.phone, idNumber: form.idNumber, address: form.address }),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message || 'Could not complete onboarding.');
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete onboarding.');
    } finally {
      setSubmitting(false);
    }
  };

  const roleRelation = invite?.admin_employee_roles;
  const role = Array.isArray(roleRelation) ? roleRelation[0] : roleRelation;

  return (
    <main className="admin-onboard">
      <section className="admin-onboard__card">
        <header><img src="/images/logo.png" alt="Lavey" /><div><span>SECURE EMPLOYEE ONBOARDING</span><h1>Welcome to the Lavey team</h1><p>Complete the missing information to activate your dashboard access.</p></div></header>
        {error ? <p className="admin-onboard__error">{error}</p> : null}
        {!invite && !error ? <p>Loading invitation…</p> : null}
        {invite ? (
          <form onSubmit={(event) => { event.preventDefault(); void complete(); }}>
            <div className="admin-onboard__summary"><div><small>EMPLOYEE</small><strong>{invite.full_name}</strong><span>{invite.email}</span></div><div><small>ROLE</small><strong>{role?.name || 'Admin user'}</strong><span>{role?.department || 'Lavey'}</span></div></div>
            <h2>Personal and contact details</h2>
            <div className="admin-onboard__grid">
              <label>Phone number<input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <label>ID or passport number<input required value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} /></label>
              <label className="wide">Residential address<textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
            </div>
            <h2>Identity document</h2>
            <label className="admin-onboard__upload"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void analyzeDocument(e.target.files?.[0] ?? null)} /><strong>Upload ID or passport</strong><span>We extract the document information and compare it with your invitation. Mismatches are flagged for review.</span></label>
            {documentStatus ? <p className="admin-onboard__document-status">{documentStatus}</p> : null}
            <h2>Create your login</h2>
            <div className="admin-onboard__grid">
              <label>Password<input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
              <label>Confirm password<input required minLength={8} type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></label>
            </div>
            <button type="submit" disabled={submitting}>{submitting ? 'Activating account…' : 'Complete onboarding'}</button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
