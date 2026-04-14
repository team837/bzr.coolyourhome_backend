const { RecaptchaEnterpriseServiceClient } = require('@google-cloud/recaptcha-enterprise');

/**
 * Create an assessment to analyze the risk of a UI action.
 *
 * @param {Object} params
 * @param {string} params.token The generated token obtained from the client.
 * @param {string} params.recaptchaAction Action name corresponding to the token.
 * @returns {Promise<number|null>} The risk score (0.0 to 1.0) or null if validation fails.
 */
async function createAssessment({
    token,
    recaptchaAction,
}) {
    const projectID = process.env.GOOGLE_CLOUD_PROJECT_ID || "coolyourhome";
    const recaptchaKey = "6LfnAYcsAAAAAI_wNVEknI9xBSwmWlb1JZl7DUSs";

    try {
        const client = new RecaptchaEnterpriseServiceClient();
        const projectPath = client.projectPath(projectID);

        // Build the assessment request.
        const request = {
            assessment: {
                event: {
                    token: token,
                    siteKey: recaptchaKey,
                },
            },
            parent: projectPath,
        };

        const [response] = await client.createAssessment(request);

        // Check if the token is valid.
        if (!response.tokenProperties.valid) {
            console.error(`reCAPTCHA Assessment: Token is invalid. Reason: ${response.tokenProperties.invalidReason}`);
            return null;
        }

        // Check if the expected action was executed.
        if (response.tokenProperties.action === recaptchaAction) {
            console.log(`reCAPTCHA Assessment: Success. Score: ${response.riskAnalysis.score}, Action: ${response.tokenProperties.action}`);
            if (response.riskAnalysis.reasons && response.riskAnalysis.reasons.length > 0) {
                console.log("reCAPTCHA Assessment: Risk reasons:", response.riskAnalysis.reasons);
            }
            return response.riskAnalysis.score;
        } else {
            console.error(`reCAPTCHA Assessment: Action mismatch. Expected '${recaptchaAction}', but got '${response.tokenProperties.action}'`);
            return null;
        }
    } catch (err) {
        console.error("reCAPTCHA Assessment: Critical Error calling Google Cloud API:");
        console.error(err);
        return null;
    }
}

module.exports = { createAssessment };
