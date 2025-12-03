import React from 'react';

const TermsOfService: React.FC = () => {
    return (
        <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Terms of Service
                    </h1>
                    <p className="text-gray-600">
                        Last Updated: December 3, 2025
                    </p>
                </div>

                {/* Content Sections */}
                <div className="space-y-8 text-gray-800">

                    {/* Introduction */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            1. Introduction
                        </h2>
                        <p className="leading-relaxed">
                            Welcome to ProjectPad AI. By accessing or using our service, you agree to be bound by these Terms of Service.
                            These terms govern your use of our AI-powered project management platform and all related services we provide.
                            If you do not agree with any part of these terms, please do not use our service.
                        </p>
                    </section>

                    {/* Acceptance of Terms */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            2. Acceptance of Terms
                        </h2>
                        <p className="leading-relaxed mb-3">
                            By creating an account and using ProjectPad AI, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. You also confirm that:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>You are at least 18 years old or have parental consent to use our service</li>
                            <li>You have the authority to enter into this agreement</li>
                            <li>You will comply with all applicable laws and regulations</li>
                            <li>All information you provide to us is accurate and up-to-date</li>
                        </ul>
                    </section>

                    {/* Description of Service */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            3. Description of Service
                        </h2>
                        <p className="leading-relaxed mb-3">
                            ProjectPad AI is a SaaS platform that provides AI-powered project management and collaboration tools. Our service includes:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>AI-assisted project planning and organization</li>
                            <li>Intelligent chat interfaces for project discussions</li>
                            <li>Integration with various AI models for enhanced productivity</li>
                            <li>Cloud-based data storage and synchronization</li>
                            <li>Collaboration features for teams</li>
                        </ul>
                        <p className="leading-relaxed mt-3">
                            We reserve the right to modify, suspend, or discontinue any aspect of our service at any time, with or without notice.
                        </p>
                    </section>

                    {/* User Responsibilities */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            4. User Responsibilities
                        </h2>
                        <p className="leading-relaxed mb-3">
                            As a user of ProjectPad AI, you agree to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Maintain the security and confidentiality of your account credentials</li>
                            <li>Use the service only for lawful purposes</li>
                            <li>Not attempt to gain unauthorized access to our systems or other users' accounts</li>
                            <li>Not upload malicious code, viruses, or harmful content</li>
                            <li>Not use the service to harass, abuse, or harm others</li>
                            <li>Not violate any intellectual property rights</li>
                            <li>Comply with our Acceptable Use Policy</li>
                            <li>Notify us immediately of any security breaches or unauthorized use</li>
                        </ul>
                        <p className="leading-relaxed mt-3">
                            You are solely responsible for all activities that occur under your account.
                        </p>
                    </section>

                    {/* Subscription & Payments */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            5. Subscription & Payments
                        </h2>
                        <p className="leading-relaxed mb-3">
                            ProjectPad AI offers both free and paid subscription plans. By subscribing to a paid plan:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>You agree to pay all fees associated with your chosen plan</li>
                            <li>Subscription fees are billed on a recurring basis (monthly or annually)</li>
                            <li>All payments are processed securely through our payment provider, Paddle</li>
                            <li>Prices are subject to change with 30 days' notice</li>
                            <li>You authorize us to charge your payment method automatically</li>
                            <li>Failed payments may result in service suspension or termination</li>
                            <li>You can upgrade, downgrade, or cancel your subscription at any time</li>
                        </ul>
                        <p className="leading-relaxed mt-3">
                            All fees are non-refundable except as required by law or as explicitly stated in our Refund Policy.
                        </p>
                    </section>

                    {/* Refund Policy */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            6. Refund Policy
                        </h2>
                        <p className="leading-relaxed mb-3">
                            We offer a 14-day money-back guarantee for new subscribers. To be eligible for a refund:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>You must request a refund within 14 days of your initial purchase</li>
                            <li>The refund applies only to your first payment</li>
                            <li>Refunds are not available for subscription renewals</li>
                            <li>Service must not have been abused or misused</li>
                        </ul>
                        <p className="leading-relaxed mt-3">
                            To request a refund, please contact our support team. Refunds will be processed within 5-10 business days
                            to your original payment method. Cancellation of your subscription does not automatically trigger a refund.
                        </p>
                    </section>

                    {/* Use of AI Services */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            7. Use of AI Services
                        </h2>
                        <p className="leading-relaxed mb-3">
                            ProjectPad AI integrates with third-party AI services and models. You acknowledge that:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>AI-generated content may not always be accurate or reliable</li>
                            <li>You are responsible for reviewing and validating all AI-generated outputs</li>
                            <li>AI responses are based on patterns and may reflect biases present in training data</li>
                            <li>We do not guarantee the accuracy, completeness, or suitability of AI-generated content</li>
                            <li>Your use of AI services is subject to our AI Usage Guidelines</li>
                            <li>You should not rely solely on AI-generated content for critical decisions</li>
                            <li>Data you input may be processed by third-party AI providers in accordance with their policies</li>
                        </ul>
                        <p className="leading-relaxed mt-3">
                            We strive to provide the best AI experience but cannot be held liable for errors or issues arising from AI-generated content.
                        </p>
                    </section>

                    {/* Limitation of Liability */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            8. Limitation of Liability
                        </h2>
                        <p className="leading-relaxed mb-3">
                            To the maximum extent permitted by law:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>ProjectPad AI is provided "as is" without warranties of any kind</li>
                            <li>We do not guarantee uninterrupted, error-free, or secure service</li>
                            <li>We are not liable for any indirect, incidental, or consequential damages</li>
                            <li>Our total liability shall not exceed the amount you paid us in the last 12 months</li>
                            <li>We are not responsible for data loss; you should maintain your own backups</li>
                            <li>We are not liable for actions of third-party services we integrate with</li>
                            <li>You use our service at your own risk</li>
                        </ul>
                        <p className="leading-relaxed mt-3">
                            Some jurisdictions do not allow limitations on warranties or liability, so these limitations may not apply to you.
                        </p>
                    </section>

                    {/* Account Termination */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            9. Account Termination
                        </h2>
                        <p className="leading-relaxed mb-3">
                            Either party may terminate this agreement:
                        </p>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">By You:</h3>
                                <ul className="list-disc pl-6 space-y-1">
                                    <li>You may cancel your account at any time through your account settings</li>
                                    <li>Cancellation is effective at the end of your current billing period</li>
                                    <li>You remain responsible for any fees incurred before cancellation</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">By Us:</h3>
                                <ul className="list-disc pl-6 space-y-1">
                                    <li>We may suspend or terminate your account for violations of these terms</li>
                                    <li>We may terminate accounts that remain inactive for extended periods</li>
                                    <li>We reserve the right to refuse service to anyone at our discretion</li>
                                    <li>Upon termination, your data may be permanently deleted after a grace period</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Governing Law */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            10. Governing Law
                        </h2>
                        <p className="leading-relaxed">
                            These Terms of Service shall be governed by and construed in accordance with the laws of the jurisdiction
                            in which our company is registered, without regard to its conflict of law provisions. Any disputes arising
                            from these terms or your use of our service shall be resolved through binding arbitration in accordance
                            with applicable arbitration rules. You agree to waive any right to a jury trial or to participate in a
                            class action lawsuit.
                        </p>
                    </section>

                    {/* Contact Information */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            11. Contact Information
                        </h2>
                        <p className="leading-relaxed mb-3">
                            If you have any questions or concerns about these Terms of Service, please contact us:
                        </p>
                        <div className="bg-gray-50 p-6 rounded-lg space-y-2">
                            <p className="font-semibold text-gray-900">ProjectPad AI Support</p>
                            <p>Email: <a href="mailto:designbyshk@gmail.com" className="text-blue-600 hover:text-blue-800">designbyshk@gmail.com</a></p>
                        </div>
                    </section>

                    {/* Changes to Terms */}
                    <section className="border-t border-gray-200 pt-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            Changes to These Terms
                        </h2>
                        <p className="leading-relaxed">
                            We reserve the right to modify these Terms of Service at any time. When we make changes, we will update
                            the "Last Updated" date at the top of this page and notify you via email or through our service. Your
                            continued use of ProjectPad AI after such modifications constitutes your acceptance of the updated terms.
                            We encourage you to review these terms periodically.
                        </p>
                    </section>

                </div>

                {/* Footer Note */}
                <div className="mt-12 pt-8 border-t border-gray-200 text-center">
                    <p className="text-sm text-gray-600">
                        By using ProjectPad AI, you acknowledge that you have read and understood these Terms of Service.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
