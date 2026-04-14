const axios = require('axios');

/**
 * Create an assessment to analyze the risk of a UI action using reCAPTCHA Enterprise REST API.
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
    const apiKey = process.env.RECAPTCHA_ENTERPRISE_API_KEY;

    if (!apiKey) {
        console.error("reCAPTCHA Assessment: RECAPTCHA_ENTERPRISE_API_KEY is missing in environment variables.");
        return null;
    }

    try {
        const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectID}/assessments?key=${apiKey}`;
        
        const response = await axios.post(url, {
            event: {
                token: token,
                siteKey: recaptchaKey,
                expectedAction: recaptchaAction
            }
        });

        const data = response.data;

        // Check if the token is valid.
        if (!data.tokenProperties.valid) {
            console.error(`reCAPTCHA Assessment: Token is invalid. Reason: ${data.tokenProperties.invalidReason}`);
            return null;
        }

        // Check if the expected action was executed.
        if (data.tokenProperties.action === recaptchaAction) {
            console.log(`reCAPTCHA Assessment: Success. Score: ${data.riskAnalysis.score}, Action: ${data.tokenProperties.action}`);
            if (data.riskAnalysis.reasons && data.riskAnalysis.reasons.length > 0) {
                console.log("reCAPTCHA Assessment: Risk reasons:", data.riskAnalysis.reasons);
            }
            return data.riskAnalysis.score;
        } else {
            console.error(`reCAPTCHA Assessment: Action mismatch. Expected '${recaptchaAction}', but got '${data.tokenProperties.action}'`);
            return null;
        }
    } catch (err) {
        console.error("reCAPTCHA Assessment: Error calling Google REST API:");
        if (err.response) {
            console.error("Response data:", err.response.data);
            console.error("Status:", err.response.status);
        } else {
            console.error(err.message);
        }
        return null;
    }
}

module.exports = { createAssessment };
