
// app/privacy/page.tsx

import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-lg text-gray-600">Last Updated: July 22, 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">

          {/* Introduction */}
          <section>
            <p className="text-lg text-gray-700 leading-relaxed">
              At AutoBrief, we are committed to protecting your privacy and ensuring the security of your personal information.
              This Privacy Policy explains how we collect, use, and safeguard your data when you use our AI-powered meeting
              transcription and analysis services.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-3">Personal Information</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Identity Data:</strong> Name, email address, company information</li>
                  <li><strong>Account Data:</strong> Login credentials, user preferences, subscription details</li>
                  <li><strong>Contact Information:</strong> Email address, phone number (if provided)</li>
                  <li><strong>Payment Data:</strong> Billing information, payment method details (processed securely through third-party providers)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-3">Meeting Data</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Audio Recordings:</strong> Meeting recordings you upload for transcription</li>
                  <li><strong>Transcriptions:</strong> AI-generated text from your meeting recordings</li>
                  <li><strong>Meeting Content:</strong> Summaries, action items, and extracted insights generated by our AI</li>
                  <li><strong>Integration Data:</strong> Information synced with your calendar, Slack, and Jira accounts</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-3">Technical Data</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Usage Information:</strong> How you interact with our platform, features used, session duration</li>
                  <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                  <li><strong>Cookies and Tracking:</strong> We use cookies to enhance your experience and analyze platform usage</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">We process your personal information for the following purposes:</p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-3">Service Delivery</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>Transcribe your meeting recordings with high accuracy</li>
                  <li>Generate AI-powered summaries and extract action items using Google Gemini AI</li>
                  <li>Identify and extract meeting dates, deadlines, and key decisions</li>
                  <li>Sync content with your integrated tools (Calendar, Slack, Jira)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-3">Platform Improvement</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>Enhance our Speech-to-Text accuracy and AI analysis capabilities</li>
                  <li>Improve user experience and platform functionality</li>
                  <li>Develop new features based on usage patterns</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-3">Communication</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>Send service-related notifications and updates</li>
                  <li>Provide customer support and respond to inquiries</li>
                  <li>Share product updates and feature announcements (with your consent)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-3">Legal and Security</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>Comply with legal obligations and regulations</li>
                  <li>Protect against fraud, security threats, and unauthorized access</li>
                  <li>Enforce our Terms of Service</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Sharing and Third Parties</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-3">AI Processing Partners</h3>
                <p className="text-gray-700">
                  <strong>Google Gemini AI:</strong> We use Google's Gemini AI to analyze transcriptions and generate summaries.
                  Google processes this data according to their privacy policies and does not retain your data for their own purposes.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-3">Integration Partners</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Calendar Services:</strong> Google Calendar, Microsoft Outlook</li>
                  <li><strong>Communication Tools:</strong> Slack</li>
                  <li><strong>Project Management:</strong> Jira</li>
                </ul>
                <p className="text-gray-700 mt-2">
                  Data shared with these services is limited to what's necessary for integration functionality.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-3">Service Providers</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Cloud Hosting:</strong> Secure cloud infrastructure for data storage and processing</li>
                  <li><strong>Payment Processing:</strong> Third-party payment processors for subscription billing</li>
                  <li><strong>Analytics:</strong> Website and application analytics to improve our services</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-800 font-medium">
                  We do not sell your personal information to third parties.
                </p>
              </div>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Security and Protection</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-3">Security Measures</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Encryption:</strong> All data is encrypted in transit and at rest using industry-standard protocols</li>
                  <li><strong>Access Controls:</strong> Strict access controls ensure only authorized personnel can access your data</li>
                  <li><strong>Regular Audits:</strong> We conduct regular security assessments and vulnerability testing</li>
                  <li><strong>SOC 2 Compliance:</strong> Our infrastructure meets SOC 2 security standards</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-3">Data Retention</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Meeting Recordings:</strong> Stored securely and deleted according to your retention preferences</li>
                  <li><strong>Transcriptions and Summaries:</strong> Retained for the duration of your account plus applicable legal requirements</li>
                  <li><strong>Account Information:</strong> Maintained while your account is active and for legitimate business purposes thereafter</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Privacy Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Privacy Rights</h2>
            <p className="text-gray-700 mb-4">You have the following rights regarding your personal information:</p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-3">Access and Control</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Access:</strong> Request copies of your personal data</li>
                  <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                  <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-3">Communication Preferences</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Marketing Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
                  <li><strong>Notification Settings:</strong> Control which service notifications you receive</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-3">Account Management</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Data Downloads:</strong> Export your transcriptions, summaries, and meeting data</li>
                  <li><strong>Account Deletion:</strong> Delete your account and associated data</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  To exercise these rights, contact us at <strong>privacy@autobrief.com</strong>
                </p>
              </div>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cookies and Tracking</h2>
            <p className="text-gray-700 mb-4">We use cookies and similar technologies to:</p>
            <ul className="space-y-2 text-gray-700 mb-4">
              <li>Maintain your login session</li>
              <li>Remember your preferences and settings</li>
              <li>Analyze platform usage and performance</li>
              <li>Provide personalized experiences</li>
            </ul>
            <p className="text-gray-700">
              You can control cookie settings through your browser preferences.
            </p>
          </section>

          {/* International Transfers */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">International Data Transfers</h2>
            <p className="text-gray-700 mb-4">
              Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place
              for international transfers, including:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li>Standard Contractual Clauses</li>
              <li>Adequacy decisions by relevant authorities</li>
              <li>Other legally recognized transfer mechanisms</li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Children's Privacy</h2>
            <p className="text-gray-700">
              AutoBrief is not intended for users under 13 years of age. We do not knowingly collect personal information
              from children under 13.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements.
              We will notify you of significant changes through:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li>Email notifications to registered users</li>
              <li>Prominent notices on our platform</li>
              <li>Updates to the "Last Updated" date above</li>
            </ul>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about this Privacy Policy or our privacy practices, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-gray-700"><strong>Email:</strong> privacy@autobrief.com</p>
              <p className="text-gray-700"><strong>Address:</strong> [Your Company Address]</p>
              <p className="text-gray-700"><strong>Data Protection Officer:</strong> [If applicable]</p>
            </div>
          </section>

          {/* Compliance */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Compliance and Certifications</h2>
            <p className="text-gray-700 mb-4">
              AutoBrief is committed to compliance with applicable privacy laws and regulations, including:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li>General Data Protection Regulation (GDPR)</li>
              <li>California Consumer Privacy Act (CCPA)</li>
              <li>Other applicable regional privacy laws</li>
            </ul>
          </section>

          {/* Footer */}
          <section className="border-t pt-8 mt-12">
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-blue-800 italic">
                This Privacy Policy is designed to be transparent about our data practices while ensuring your meeting
                information remains secure and private. We believe in giving you control over your data while delivering
                the powerful AI insights that make your meetings more productive.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
