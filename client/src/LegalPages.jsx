import React from 'react';

export const PrivacyPage = () => {
  return (
    <div className="legal-page-container">
      <div className="legal-content">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last Updated: January 12, 2026</p>
        
        <div className="legal-section">
          <h2>1. Introduction</h2>
          <p>
            ForgetSubs ("we", "our", or "us") is committed to protecting your financial privacy through a <strong>"Privacy-First Hybrid Architecture"</strong>. 
            This Privacy Policy explains our revolutionary approach where <strong>your files never leave your device</strong>, ensuring maximum privacy and security.
          </p>
        </div>

        <div className="legal-section">
          <h2>2. Client-Side Processing Model</h2>
          <p>
            Unlike traditional financial apps that upload your sensitive documents to remote servers, we process your data differently:
          </p>
          <ul>
            <li><strong>Browser-Only File Processing:</strong> When you upload a PDF or CSV file, it is processed entirely within your web browser. The file itself <strong>never leaves your device</strong>.</li>
            <li><strong>Local Text Extraction:</strong> Our JavaScript code extracts text from your PDF (using pdf.js library) or reads your CSV file directly in your browser's memory.</li>
            <li><strong>Client-Side PII Redaction:</strong> Before any data transmission, our browser-based code automatically strips all Personally Identifiable Information including:
              <ul>
                <li>Account numbers and routing numbers</li>
                <li>Full names and account holder information</li>
                <li>Physical addresses (home, mailing, billing)</li>
                <li>Phone numbers and email addresses</li>
                <li>Social Security Numbers and other ID numbers</li>
              </ul>
            </li>
            <li><strong>Redacted Text Only:</strong> Only the sanitized, redacted transaction text is sent to our server—never your original file.</li>
            <li><strong>Zero File Upload:</strong> We cannot access, view, or store your bank statements or transaction files. This is not a policy choice; it's an architectural impossibility.</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>3. Supported File Formats</h2>
          <p>
            ForgetSubs accepts the following file formats, all processed with the same privacy-first approach:
          </p>
          <ul>
            <li><strong>PDF Documents:</strong> Bank statements, credit card statements, financial reports (extracted using pdf.js in your browser)</li>
            <li><strong>CSV Files:</strong> Transaction exports, bank data exports, spreadsheet exports (read directly as text in your browser)</li>
          </ul>
          <p>
            Both formats are processed identically:
          </p>
          <ol>
            <li>File stays on your device</li>
            <li>Text extracted in browser</li>
            <li>PII redacted locally</li>
            <li>Only redacted text transmitted</li>
          </ol>
        </div>

        <div className="legal-section">
          <h2>4. Server-Side Processing</h2>
          <p>
            Our servers receive <strong>only redacted transaction text</strong> (never your original files). This text is processed as follows:
          </p>
          <ul>
            <li><strong>Additional Server-Side Redaction:</strong> As a backup safety measure, our server applies a second layer of PII redaction to the already-sanitized text.</li>
            <li><strong>RAM-Only Storage:</strong> The redacted text is held in volatile server memory (RAM) only during AI analysis. It is never written to disk or permanent storage.</li>
            <li><strong>Immediate Purging:</strong> After the AI analysis is complete and results are sent to your browser, the text is automatically purged from server memory (typically within seconds, maximum 30 minutes via cache cleanup).</li>
            <li><strong>No Reconstruction Possible:</strong> Since we never receive the original file and the redacted text is destroyed immediately, it is technically impossible for us to reconstruct your financial documents.</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>5. AI Processing & Third-Party Services</h2>
          <p>
            We utilize Google Gemini AI to analyze transaction patterns. Here's how your data is protected:
          </p>
          <ul>
            <li><strong>Double-Redacted Data Only:</strong> The AI receives text that has been redacted twice (client-side and server-side). All PII has been removed.</li>
            <li><strong>Anonymous Transaction Patterns:</strong> The AI analyzes only transaction descriptions, dates, and amounts—with no identifying information.</li>
            <li><strong>No Training Data:</strong> Per Google's enterprise API terms, data sent via our API integration is not used to train AI models.</li>
            <li><strong>Encrypted Transmission:</strong> All data transmitted to Google's servers is encrypted via HTTPS/TLS.</li>
            <li><strong>No File Upload to AI:</strong> Google never receives your PDF or CSV files—only pre-processed, redacted text strings.</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>6. What We Cannot Do</h2>
          <p>
            Due to our privacy-first architecture, we are <strong>technically unable</strong> to:
          </p>
          <ul>
            <li>Access, view, or download your original PDF or CSV files</li>
            <li>Retrieve your bank statements or transaction history</li>
            <li>See your account numbers, balances, or personal information</li>
            <li>Store your financial documents in any database</li>
            <li>Reconstruct your data after analysis is complete</li>
            <li>Share your files with third parties (because we never receive them)</li>
          </ul>
          <p>
            <strong>This is a feature, not a limitation.</strong> Our architecture makes it impossible for your sensitive data to be compromised through our service.
          </p>
        </div>

        <div className="legal-section">
          <h2>7. Blockchain & Wallet Data</h2>
          <p>
            When you connect your cryptocurrency wallet (e.g., MetaMask, Rainbow, WalletConnect), we collect your <strong>Public Wallet Address</strong> for:
          </p>
          <ul>
            <li><strong>Payment Verification:</strong> Confirming USDC transfer transactions on supported blockchains (Monad Mainnet, BNB Smart Chain, Base, Ethereum)</li>
            <li><strong>NFT Verification:</strong> Checking ownership of qualifying NFTs (e.g., 2+ Octonads) for premium access</li>
            <li><strong>Referral Tracking:</strong> Recording successful referrals and distributing rewards (1.5 USDC per successful referral)</li>
          </ul>
          <p>
            Wallet addresses are public blockchain data. We <strong>never</strong> have access to your private keys, seed phrases, or the ability to initiate transactions without your explicit approval.
          </p>
        </div>

        <div className="legal-section">
          <h2>8. Data We Do Store</h2>
          <p>
            We store minimal data in our Supabase database, limited to:
          </p>
          <ul>
            <li><strong>Public wallet addresses</strong> (for payment/NFT verification)</li>
            <li><strong>Referral statistics</strong> (referrer codes, click counts, earnings)</li>
            <li><strong>Transaction hashes</strong> (for preventing duplicate referral claims)</li>
            <li><strong>Withdrawal records</strong> (for referral payout tracking)</li>
          </ul>
          <p>
            We <strong>do NOT store</strong>:
          </p>
          <ul>
            <li>Bank statements, PDFs, or CSV files</li>
            <li>Transaction details or subscription lists</li>
            <li>Personal names, addresses, or contact information</li>
            <li>Account numbers or financial credentials</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>9. Report Data & Session Management</h2>
          <p>
            When you analyze a file, we generate a temporary report:
          </p>
          <ul>
            <li><strong>Report Summary:</strong> Stored in server RAM cache for up to 30 minutes with a unique report ID</li>
            <li><strong>Detailed Report:</strong> Released only after payment or NFT verification</li>
            <li><strong>Automatic Expiration:</strong> Reports are automatically deleted from cache after 30 minutes or when the cache cleanup process runs (whichever comes first)</li>
            <li><strong>Session-Based:</strong> If you refresh your browser or close the tab, you lose access to the report (you must re-upload and re-analyze)</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>10. Third-Party Infrastructure</h2>
          <p>We rely on the following trusted service providers:</p>
          <ul>
            <li><strong>Supabase (Database):</strong> Stores wallet addresses and referral data only—no financial documents</li>
            <li><strong>Google Gemini AI:</strong> Analyzes double-redacted transaction text—never receives original files</li>
            <li><strong>RPC Providers:</strong> Blockchain nodes used to query on-chain data (Monad, BSC, Base, Ethereum)</li>
            <li><strong>Cloudflare (CDN):</strong> May cache static assets (CSS, JavaScript) but never caches API responses or user data</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>11. Your Privacy Rights</h2>
          <p>
            You have the following rights regarding your data:
          </p>
          <ul>
            <li><strong>Right to Access:</strong> Request a copy of the wallet address and referral data we have stored</li>
            <li><strong>Right to Deletion:</strong> Request deletion of your wallet address and referral records from our database</li>
            <li><strong>Right to Rectification:</strong> Request correction of inaccurate referral data</li>
            <li><strong>Right to Portability:</strong> Request an export of your referral earnings data</li>
          </ul>
          <p>
            Note: We cannot provide access to, delete, or rectify your financial documents because <strong>we never receive or store them</strong>.
          </p>
        </div>

        <div className="legal-section">
          <h2>12. Security Measures</h2>
          <p>
            We implement industry-standard security practices:
          </p>
          <ul>
            <li><strong>HTTPS/TLS Encryption:</strong> All data transmitted to our servers is encrypted in transit</li>
            <li><strong>Rate Limiting:</strong> Prevents abuse and DDoS attacks</li>
            <li><strong>Input Validation:</strong> Sanitizes all user inputs to prevent injection attacks</li>
            <li><strong>Helmet.js Security Headers:</strong> Protects against common web vulnerabilities</li>
            <li><strong>No Disk Storage:</strong> Financial data never touches permanent storage</li>
            <li><strong>Automatic Cache Cleanup:</strong> Ensures old data is purged regularly</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>13. Children's Privacy</h2>
          <p>
            ForgetSubs is not intended for users under 18 years of age. We do not knowingly collect data from minors. If you are a parent and believe your child has used our service, please contact us immediately.
          </p>
        </div>

        <div className="legal-section">
          <h2>14. International Users</h2>
          <p>
            ForgetSubs is operated from the United States. If you are accessing the service from outside the US, please be aware that your data may be processed in the US where data protection laws may differ from your jurisdiction.
          </p>
        </div>

        <div className="legal-section">
          <h2>15. Changes to Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last Updated" date. Continued use of the service after changes constitutes acceptance of the updated policy.
          </p>
        </div>

        <div className="legal-section">
          <h2>16. Contact Information</h2>
          <p>
            For privacy-related questions, data access requests, or concerns, please contact us via the "Contact Us" form in the footer, or email us at the address provided there.
          </p>
        </div>

        <div className="legal-section highlight-box">
          <h3>🔒 Privacy Summary</h3>
          <p><strong>Your files never leave your device.</strong></p>
          <p>
            We've built ForgetSubs with privacy as the foundation, not an afterthought. 
            Your bank statements and transaction files are processed entirely in your browser. 
            We receive only redacted transaction text—never your original documents. 
            This architectural choice means your most sensitive financial data remains under your complete control.
          </p>
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
        <p className="last-updated">Last Updated: January 12, 2026</p>

        <div className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using ForgetSubs (the "Service"), you agree to be bound by these Terms of Service ("Terms"). 
            If you disagree with any part of these terms, you may not use the Service.
          </p>
          <p>
            These Terms apply to all visitors, users, and others who access or use the Service, including those who:
          </p>
          <ul>
            <li>Upload financial documents (PDF or CSV files) for analysis</li>
            <li>Connect cryptocurrency wallets for payment or verification</li>
            <li>Participate in the referral program</li>
            <li>Access premium features via payment or NFT ownership</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>2. Nature of Service</h2>
          <p>
            ForgetSubs is an automated analysis tool that uses Artificial Intelligence to identify recurring subscription payments from uploaded financial documents.
          </p>
          
          <h3>2.1 Supported File Formats</h3>
          <ul>
            <li><strong>PDF Documents:</strong> Bank statements, credit card statements, transaction reports</li>
            <li><strong>CSV Files:</strong> Transaction exports, bank data files, spreadsheet exports</li>
          </ul>
          
          <h3>2.2 Service Capabilities</h3>
          <ul>
            <li>Automatic detection of recurring subscription charges</li>
            <li>Calculation of monthly and annual subscription costs</li>
            <li>Provision of cancellation links for identified subscriptions</li>
            <li>Generation of visual reports and analytics</li>
          </ul>

          <h3>2.3 Important Disclaimers</h3>
          <ul>
            <li><strong>Informational Purposes Only:</strong> All reports, analyses, and recommendations provided by the Service are for informational purposes only and do not constitute financial, tax, investment, or legal advice.</li>
            <li><strong>AI Limitations:</strong> The Service uses Artificial Intelligence (specifically Google Gemini) which may occasionally:
              <ul>
                <li>Produce errors or "hallucinations"</li>
                <li>Incorrectly identify non-subscription transactions as subscriptions</li>
                <li>Miss legitimate subscription charges</li>
                <li>Miscalculate amounts or frequencies</li>
              </ul>
            </li>
            <li><strong>User Verification Required:</strong> You should verify all data against your actual bank records before taking any action.</li>
            <li><strong>No Direct Cancellation:</strong> We provide external links to subscription cancellation pages for convenience only. We cannot cancel subscriptions on your behalf, and we are not responsible for the cancellation policies or processes of third-party subscription services.</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>3. User Privacy & Data Processing</h2>
          
          <h3>3.1 Client-Side Processing</h3>
          <p>
            By using ForgetSubs, you acknowledge and agree that:
          </p>
          <ul>
            <li>Your uploaded files (PDF or CSV) are processed entirely in your web browser and <strong>never uploaded to our servers</strong></li>
            <li>Only redacted transaction text (with all personal information removed) is transmitted to our servers</li>
            <li>We cannot access, view, store, or retrieve your original financial documents</li>
          </ul>

          <h3>3.2 Data Retention</h3>
          <ul>
            <li>Redacted text is held in server RAM only during analysis (typically seconds, maximum 30 minutes)</li>
            <li>Report data is cached temporarily with automatic expiration</li>
            <li>Wallet addresses and referral data are stored in our database for payment and reward processing</li>
          </ul>

          <h3>3.3 User Responsibility</h3>
          <p>
            You are solely responsible for:
          </p>
          <ul>
            <li>The security of your device and browser</li>
            <li>Ensuring your uploaded documents are free from malware or viruses</li>
            <li>Maintaining the privacy of your session and not sharing report links</li>
            <li>Logging out or closing your browser to end your session securely</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>4. Payments, Refunds & Cryptocurrency</h2>
          
          <h3>4.1 Payment Methods</h3>
          <p>
            Premium report access can be obtained through:
          </p>
          <ul>
            <li><strong>Cryptocurrency Payment:</strong> 5 USDC on supported networks (Monad Mainnet, BNB Smart Chain, Base, Ethereum)</li>
            <li><strong>NFT Verification:</strong> Proof of ownership of 2+ qualifying NFTs (e.g., Octonads)</li>
          </ul>

          <h3>4.2 Blockchain Transaction Rules</h3>
          <ul>
            <li><strong>Finality:</strong> All cryptocurrency transactions are processed on-chain and are immutable once confirmed. <strong>All sales are final and non-refundable.</strong></li>
            <li><strong>Network Fees:</strong> You are solely responsible for all gas fees, transaction fees, and network costs associated with your blockchain transactions.</li>
            <li><strong>Transaction Confirmation:</strong> Service delivery (unlocking detailed reports) is contingent upon successful confirmation of your transaction on the blockchain network (typically 1-3 block confirmations).</li>
            <li><strong>Failed Transactions:</strong> If your transaction fails due to insufficient gas, network congestion, or other blockchain-related issues, we are not responsible for any lost funds or failed deliveries.</li>
            <li><strong>Wrong Network:</strong> Sending payments on unsupported networks will result in permanent loss of funds. We cannot recover tokens sent to the wrong network or address.</li>
          </ul>

          <h3>4.3 No Refund Policy</h3>
          <p>
            Due to the nature of blockchain transactions and the instant delivery of digital services:
          </p>
          <ul>
            <li>All payments are <strong>final and non-refundable</strong></li>
            <li>Once a report is unlocked and delivered, the sale is complete</li>
            <li>We do not offer refunds for:
              <ul>
                <li>AI analysis errors or inaccuracies</li>
                <li>Dissatisfaction with results</li>
                <li>Change of mind after payment</li>
                <li>Technical issues on the user's end</li>
              </ul>
            </li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>5. NFT Holder Access</h2>
          
          <h3>5.1 Qualifying NFTs</h3>
          <p>
            Users holding qualifying NFT assets may access premium features without cryptocurrency payment. Currently qualifying NFTs include:
          </p>
          <ul>
            <li>Octonads NFTs (minimum 2 NFTs required)</li>
            <li>Other qualifying collections as announced on our website</li>
          </ul>

          <h3>5.2 Verification Process</h3>
          <ul>
            <li><strong>Cryptographic Signature:</strong> We verify NFT ownership via a cryptographic signature from your connected wallet</li>
            <li><strong>No Asset Control:</strong> This process does <strong>not</strong> grant us permission to move, transfer, sell, or otherwise control your NFTs</li>
            <li><strong>Read-Only Access:</strong> We only read your wallet's public data to verify ownership</li>
          </ul>

          <h3>5.3 Dynamic Access</h3>
          <ul>
            <li>Premium access is verified at the time of each report unlock request</li>
            <li>If your NFT balance drops below the required threshold (e.g., you sell or transfer NFTs), premium access will be revoked immediately</li>
            <li>You may regain access by re-acquiring the required NFT holdings</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>6. Referral Program</h2>
          
          <h3>6.1 How It Works</h3>
          <ul>
            <li>Users can generate a unique referral link from the "Refer & Earn" page</li>
            <li>When someone uses your link and makes a successful payment (5 USDC), you earn 1.5 USDC</li>
            <li>Referral rewards are tracked on-chain via transaction hash verification</li>
          </ul>

          <h3>6.2 Referral Rules</h3>
          <ul>
            <li><strong>Valid Referrals Only:</strong> Rewards are only paid for genuine referrals where payment is successfully confirmed on the blockchain</li>
            <li><strong>No Self-Referrals:</strong> You cannot earn rewards by referring yourself or using your own referral link</li>
            <li><strong>No Fraudulent Activity:</strong> Any attempt to game the system, create fake referrals, or manipulate the referral program will result in:
              <ul>
                <li>Immediate forfeiture of all pending rewards</li>
                <li>Permanent ban from the referral program</li>
                <li>Potential legal action for fraud</li>
              </ul>
            </li>
            <li><strong>Transaction Hash Deduplication:</strong> Each transaction hash can only be claimed once to prevent duplicate reward claims</li>
          </ul>

          <h3>6.3 Withdrawals</h3>
          <ul>
            <li>Referral earnings can be withdrawn to your connected wallet address</li>
            <li>Minimum withdrawal amount and withdrawal fees may apply</li>
            <li>Withdrawals are processed on the same blockchain network where earnings were accumulated</li>
            <li>We reserve the right to delay or deny withdrawals if fraudulent activity is suspected</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>7. User Obligations & Prohibited Conduct</h2>
          
          <h3>7.1 You Must</h3>
          <ul>
            <li>Be at least 18 years old to use the Service</li>
            <li>Be the lawful owner of any financial documents you upload</li>
            <li>Have legal authority to connect any cryptocurrency wallets you use</li>
            <li>Comply with all applicable laws and regulations</li>
            <li>Provide accurate information when required</li>
          </ul>

          <h3>7.2 You Must Not</h3>
          <ul>
            <li>Upload documents belonging to third parties without their explicit consent</li>
            <li>Use the Service for any illegal activities, including:
              <ul>
                <li>Money laundering</li>
                <li>Fraud or financial crimes</li>
                <li>Tax evasion</li>
                <li>Terrorist financing</li>
              </ul>
            </li>
            <li>Attempt to reverse engineer, decompile, or hack the Service</li>
            <li>Use automated scripts, bots, or scrapers to access the Service</li>
            <li>Attempt to bypass payment mechanisms or access premium features without authorization</li>
            <li>Share your session or report links with unauthorized parties</li>
            <li>Submit malicious files, viruses, or malware</li>
            <li>Abuse the referral program or create fraudulent referrals</li>
            <li>Overload or attempt to disrupt our servers (DDoS attacks)</li>
          </ul>

          <h3>7.3 Consequences of Violation</h3>
          <p>
            Violation of these Terms may result in:
          </p>
          <ul>
            <li>Immediate termination of your access to the Service</li>
            <li>Forfeiture of any pending referral rewards</li>
            <li>Reporting to relevant authorities for illegal activities</li>
            <li>Legal action to recover damages</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>8. Intellectual Property</h2>
          <ul>
            <li>All content, code, designs, logos, and trademarks on ForgetSubs are owned by us or our licensors</li>
            <li>You may not copy, reproduce, distribute, or create derivative works without written permission</li>
            <li>The ForgetSubs name, logo, and branding are protected trademarks</li>
            <li>User-uploaded documents remain your property; we claim no ownership rights</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>9. Limitation of Liability</h2>
          
          <h3>9.1 Service "As-Is"</h3>
          <p>
            ForgetSubs is provided on an "AS-IS" and "AS-AVAILABLE" basis without warranties of any kind, either express or implied, including but not limited to:
          </p>
          <ul>
            <li>Merchantability</li>
            <li>Fitness for a particular purpose</li>
            <li>Accuracy or reliability of results</li>
            <li>Uninterrupted or error-free operation</li>
          </ul>

          <h3>9.2 Liability Cap</h3>
          <p>
            To the maximum extent permitted by law, ForgetSubs and its operators, employees, and affiliates shall NOT be liable for any:
          </p>
          <ul>
            <li>Indirect, incidental, special, consequential, or punitive damages</li>
            <li>Loss of profits, revenue, data, or use</li>
            <li>Financial losses resulting from reliance on our AI analysis</li>
            <li>Damages arising from unauthorized access to your wallet or device</li>
          </ul>
          <p>
            In no event shall our total liability exceed the amount you paid for the Service (e.g., 5 USDC for a single report unlock).
          </p>

          <h3>9.3 Specific Disclaimers</h3>
          <p>
            We are NOT responsible for:
          </p>
          <ul>
            <li><strong>Blockchain Issues:</strong> Smart contract vulnerabilities, network congestion, or failed transactions</li>
            <li><strong>AI Errors:</strong> Incorrect analysis, false positives/negatives, or "hallucinated" data from the AI</li>
            <li><strong>Third-Party Services:</strong> Actions or inactions of subscription providers, payment processors, or NFT platforms</li>
            <li><strong>Wallet Security:</strong> Compromised private keys, stolen seed phrases, or unauthorized wallet access on your end</li>
            <li><strong>Market Changes:</strong> Changes in cryptocurrency prices, gas fees, or network fees</li>
            <li><strong>Regulatory Changes:</strong> Changes in laws that may affect the Service's availability in your jurisdiction</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>10. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless ForgetSubs and its operators from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
          </p>
          <ul>
            <li>Your use or misuse of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
            <li>Your uploaded documents or data</li>
            <li>Your participation in the referral program</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>11. Dispute Resolution & Arbitration</h2>
          
          <h3>11.1 Governing Law</h3>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the United States and the State of [Your State], without regard to conflict of law principles.
          </p>

          <h3>11.2 Arbitration Agreement</h3>
          <p>
            Any dispute arising from these Terms or your use of the Service shall be resolved through binding arbitration rather than in court, except that:
          </p>
          <ul>
            <li>You may assert claims in small claims court if they qualify</li>
            <li>Either party may seek injunctive relief in court for intellectual property violations</li>
          </ul>

          <h3>11.3 Class Action Waiver</h3>
          <p>
            You agree to resolve disputes with us only on an individual basis, and not as part of any class action, collective action, or representative proceeding.
          </p>
        </div>

        <div className="legal-section">
          <h2>12. Termination</h2>
          <p>
            We reserve the right to:
          </p>
          <ul>
            <li>Suspend or terminate your access to the Service at any time, with or without cause</li>
            <li>Modify or discontinue the Service (or any part thereof) at any time</li>
            <li>Change these Terms at any time by posting updated Terms on the website</li>
          </ul>
          <p>
            You may stop using the Service at any time. Upon termination:
          </p>
          <ul>
            <li>Your right to access the Service immediately ceases</li>
            <li>Any pending referral rewards may be forfeited</li>
            <li>Provisions regarding liability, indemnification, and dispute resolution survive termination</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>13. Modifications to Terms</h2>
          <p>
            We may revise these Terms from time to time. Changes will be posted on this page with an updated "Last Updated" date. Material changes will be communicated via:
          </p>
          <ul>
            <li>Prominent notice on the website</li>
            <li>Email notification (if you have provided an email)</li>
          </ul>
          <p>
            Continued use of the Service after changes are posted constitutes acceptance of the updated Terms. If you disagree with the changes, you must stop using the Service.
          </p>
        </div>

        <div className="legal-section">
          <h2>14. Severability</h2>
          <p>
            If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
          </p>
        </div>

        <div className="legal-section">
          <h2>15. Entire Agreement</h2>
          <p>
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and ForgetSubs regarding the Service and supersede all prior agreements and understandings.
          </p>
        </div>

        <div className="legal-section">
          <h2>16. Contact & Legal Notices</h2>
          <p>
            For questions about these Terms, legal concerns, or to report violations:
          </p>
          <ul>
            <li>Use the "Contact Us" form in the website footer</li>
            <li>Email us at the address provided in the footer</li>
          </ul>
          <p>
            Legal notices and official communications should be sent in writing to the address provided on our website.
          </p>
        </div>

        <div className="legal-section highlight-box">
          <h3>⚖️ Terms Summary</h3>
          <p><strong>Use ForgetSubs responsibly and at your own risk.</strong></p>
          <p>
            By using our Service, you acknowledge that AI analysis may contain errors, 
            all cryptocurrency payments are final and non-refundable, and you are solely 
            responsible for verifying all information before taking action. 
            We've built robust privacy protections, but you remain responsible for 
            the security of your own devices, wallets, and data.
          </p>
        </div>
      </div>
    </div>
  );
};