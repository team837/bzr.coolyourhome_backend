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
            console.log(`The CreateAssessment call failed because the token was: ${response.tokenProperties.invalidReason}`);
            return null;
        }

        // Check if the expected action was executed.
        if (response.tokenProperties.action === recaptchaAction) {
            console.log(`The reCAPTCHA score is: ${response.riskAnalysis.score}`);
            response.riskAnalysis.reasons.forEach((reason) => {
                console.log("reCAPTCHA risk reason:", reason);
            });

            return response.riskAnalysis.score;
        } else {
            console.log(`The action attribute in your reCAPTCHA tag (${response.tokenProperties.action}) does not match the action you are expecting to score (${recaptchaAction})`);
            return null;
        }
    } catch (err) {
        console.error("reCAPTCHA Enterprise Error:", err);
        return null;
    }
}

module.exports = { createAssessment };
