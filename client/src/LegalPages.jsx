// LegalPages.jsx
import React from 'react';

export const PrivacyPage = () => {
  return (
    <div className="legal-page-container">
      <div className="legal-content">
        <h1>Privacy Policy</h1>
        <p>Last updated: January 2026</p>
        
        <h2>1. Data Minimization</h2>
        <p>ForgetSubs operates on a strict "RAM-Only" processing model. When you upload a bank statement, it is processed in the volatile memory of our servers.</p>
        
        <h2>2. No Storage</h2>
        <p>We do not write your files to disk. Once the analysis is complete and the response is sent to your browser, the data is immediately purged from memory.</p>
        
        <h2>3. Third-Party Processing</h2>
        <p>We use Gemini AI for text analysis. We strip identifiable patterns (addresses, account numbers) before sending data to the AI. The AI provider does not use this data for training.</p>
        
        <h2>4. User Rights</h2>
        <p>Since we do not store your data, there is nothing to delete. Your financial privacy is preserved by design.</p>
      </div>
    </div>
  );
};

export const TermsPage = () => {
  return (
    <div className="legal-page-container">
      <div className="legal-content">
        <h1>Terms of Service</h1>
        <p>Last updated: January 2026</p>

        <h2>1. Acceptance</h2>
        <p>By using ForgetSubs, you agree to these terms. You must own the bank statements you upload.</p>

        <h2>2. Financial Advice</h2>
        <p>The reports generated are for informational purposes only. ForgetSubs is not a financial advisor. Cancellation links are provided for convenience.</p>

        <h2>3. Payments & Refunds</h2>
        <p>Payments made in cryptocurrency (USDC) are final. The service is rendered immediately upon unlocking the report.</p>

        <h2>4. Limitation of Liability</h2>
        <p>ForgetSubs is not responsible for errors in analysis or failed cancellations on third-party websites.</p>
      </div>
    </div>
  );
};