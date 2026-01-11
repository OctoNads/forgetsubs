import React from 'react';

export const PrivacyPage = () => {
  return (
    <div className="legal-page-container">
      <div className="legal-content">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last Updated: January 11, 2026</p>
        
        <div className="legal-section">
          <h2>1. Introduction</h2>
          <p>
            ForgetSubs ("we", "our", or "us") is committed to protecting your financial privacy through a "Privacy-by-Design" architecture. 
            This Privacy Policy explains how we handle your data, specifically focusing on our <strong>Ephemeral Processing</strong> model.
          </p>
        </div>

        <div className="legal-section">
          <h2>2. The "RAM-Only" Processing Model</h2>
          <p>
            Unlike traditional financial apps, we do not store your bank statements or credit card files. Our system operates on a strictly ephemeral basis:
          </p>
          <ul>
            <li><strong>Volatile Memory:</strong> When you upload a document, it is buffered solely in the server's Random Access Memory (RAM). It is never written to a hard drive or database storage.</li>
            <li><strong>Immediate Destruction:</strong> Once the analysis is complete and the summary is returned to your browser, the data is automatically purged from our active memory cache (typically within 30 minutes or less).</li>
            <li><strong>No Archival:</strong> We cannot retrieve your documents after analysis. If you refresh the page or lose your session, you must re-upload the file.</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>3. Data Redaction & AI Processing</h2>
          <p>
            We utilize Third-Party Artificial Intelligence (Google Gemini) to analyze transaction patterns. To protect your identity, we employ a strict <strong>Pre-Processing Redaction Protocol</strong>:
          </p>
          <ul>
            <li><strong>Local Sanitization:</strong> Before your data is sent to the AI provider, our server automatically strips Personally Identifiable Information (PII) such as Names, Account Numbers, Addresses, and Phone Numbers using regex pattern matching.</li>
            <li><strong>Anonymized Payload:</strong> The AI provider receives only a sanitized text block containing transaction descriptions and dates. They do not receive your raw PDF file.</li>
            <li><strong>No Training:</strong> Data processed via our API integration is not used by the AI provider to train their models, in accordance with their enterprise data terms.</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>4. Blockchain & Wallet Data</h2>
          <p>
            When you connect your wallet (e.g., via MetaMask, Rainbow), we collect your <strong>Public Wallet Address</strong>. This is used solely for:
          </p>
          <ul>
            <li>Verifying payments (USDC transfers).</li>
            <li>Verifying NFT ownership (Octonads) for premium access.</li>
            <li>Tracking referral rewards in our public ledger database.</li>
          </ul>
          <p>We do not have access to your private keys or seed phrases. We cannot initiate transactions without your explicit approval.</p>
        </div>

        <div className="legal-section">
          <h2>5. Third-Party Services</h2>
          <p>We rely on the following trusted infrastructure providers:</p>
          <ul>
            <li><strong>Supabase:</strong> Stores public wallet addresses and referral statistics (clicks/earnings). No financial documents are stored here.</li>
            <li><strong>Google Gemini API:</strong> Performs the text analysis on redacted data.</li>
            <li><strong>RPC Providers:</strong> Nodes used to query blockchain data (Monad, BSC, Base, Ethereum).</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export const TermsPage = () => {
  return (
    <div className="legal-page-container">
      <div className="legal-content">
        <h1>Terms of Service</h1>
        <p className="last-updated">Last Updated: January 11, 2026</p>

        <div className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using ForgetSubs (the "Service"), you agree to be bound by these Terms. If you disagree with any part of the terms, you may not use the Service.
          </p>
        </div>

        <div className="legal-section">
          <h2>2. Nature of Service</h2>
          <p>
            ForgetSubs is an automated analysis tool designed to identify recurring subscription payments from uploaded statements.
          </p>
          <ul>
            <li><strong>Informational Purposes Only:</strong> The reports generated are for your information only and do not constitute financial, tax, or legal advice.</li>
            <li><strong>AI Limitations:</strong> The Service uses Artificial Intelligence which may occasionally produce errors, "hallucinations," or identify non-subscription transactions as subscriptions. You should verify all data against your actual bank records.</li>
            <li><strong>No Direct Cancellation:</strong> We provide links to external cancellation pages for convenience. We cannot cancel subscriptions on your behalf.</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>3. Payments & Refunds</h2>
          <ul>
            <li><strong>Blockchain Finality:</strong> All payments made in cryptocurrency (USDC) are processed on-chain. Due to the immutable nature of blockchain transactions, <strong>all sales are final and non-refundable</strong>.</li>
            <li><strong>Network Fees:</strong> You are responsible for all gas fees associated with your transactions.</li>
            <li><strong>Verification:</strong> Service delivery (unlocking the report) is contingent upon successful confirmation of the transaction on the respective blockchain network.</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>4. NFT Holder Access</h2>
          <p>
            Users holding qualifying assets (e.g., 2+ OCTONADS NFTs) may access premium features without payment.
          </p>
          <ul>
            <li><strong>Ownership Check:</strong> We verify ownership via a cryptographic signature. This process does not grant us permission to move or transfer your assets.</li>
            <li><strong>Fluctuation:</strong> If your balance drops below the threshold, access to premium features may be revoked immediately.</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>5. User Obligations</h2>
          <p>You agree that:</p>
          <ul>
            <li>You are the lawful owner of the financial documents you upload.</li>
            <li>You will not upload documents belonging to third parties without their consent.</li>
            <li>You will not use the Service for any illegal activities, including money laundering or fraud.</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>6. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, ForgetSubs shall not be liable for any indirect, incidental, special, or consequential damages. In no event shall our total liability exceed the amount you paid for the Service (e.g., 5 USDC).
          </p>
          <p>
            We are not responsible for any losses incurred due to:
            <br />- Smart contract vulnerabilities in the underlying blockchains.
            <br />- Errors in the AI analysis.
            <br />- Wallet security compromises on the user's end.
          </p>
        </div>

        <div className="legal-section">
          <h2>7. Contact</h2>
          <p>
            For support or legal inquiries, please use the "Contact Us" form located in the footer of our website.
          </p>
        </div>
      </div>
    </div>
  );
};