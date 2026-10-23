import { fetchWithAuth } from "../../../utils/api";

const postJson = async (route, body) => {
    const response = await fetchWithAuth(route, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    return response.json();
};

const getJson = async (route) => {
    const response = await fetchWithAuth(route, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    return response.json();
};

export const DELETE_CUSTOMER_ENDPOINT = "";

export const FEEDBACK_LIST_ROUTE = "CFM/GetFeedbackContents";

export const getCustomers = async ({ orgId }) =>
    postJson("CFM/GetCustomers", { OrgId: orgId });

export const saveCustomer = async ({
    orgId,
    userId,
    customer,
    imageFile = null,
    oldImageUrl = "",
}) => {
    const formData = new FormData();

    formData.append("OrgId", orgId);
    formData.append("UserId", userId);
    formData.append("Action", "CUSTOMER");
    formData.append("JsonData", JSON.stringify(customer));

    if (imageFile) {
        formData.append("ImageUrl", imageFile);

        if (oldImageUrl) {
            formData.append("OldImageUrl", oldImageUrl);
        }
    }

    const response = await fetchWithAuth("file_upload/SaveCustomer", {
        method: "POST",
        body: formData,
    });

    return response.json();
};

export const deleteCustomer = async ({ orgId, userId, customerId }) => {
    if (!DELETE_CUSTOMER_ENDPOINT) {
        throw new Error(
            "No delete endpoint configured — set DELETE_CUSTOMER_ENDPOINT in cfmServices.js"
        );
    }

    return postJson(DELETE_CUSTOMER_ENDPOINT, {
        OrgId: orgId,
        UserId: userId,
        Action: "CUSTOMER",
        JsonData: { Id: Number(customerId) },
    });
};

// Active / inactive customer — CFM/InactiveCustomer (@IsActive, @UpdatedBy, @Id).
// IsActive is 1 to activate, 0 to deactivate.
export const setCustomerActive = async ({ orgId, userId, customerId, isActive }) =>
    postJson("CFM/InactiveCustomer", {
        OrgId: orgId,
        Id: Number(customerId),
        IsActive: isActive ? 1 : 0,
        UpdatedBy: Number(userId) || 0,
    });

// Active / inactive feedback content — CFM/InactivefbContents
// (@IsActive, @UpdatedBy, @Id). IsActive is 1 to activate, 0 to deactivate.
export const setFeedbackContentActive = async ({ orgId, userId, contentId, isActive }) =>
    postJson("CFM/InactivefbContents", {
        OrgId: orgId,
        Id: Number(contentId),
        IsActive: isActive ? 1 : 0,
        UpdatedBy: Number(userId) || 0,
    });

export const getMasterTypes = async ({
    orgId,
    deptId = 0,
    moduleId = 19,
    typeCategory = 8,
}) =>
    getJson(
        `Portal/GetMasterTypes?OrgId=${orgId}&DeptId=${deptId}&ModuleId=${moduleId}&TypeCategory=${typeCategory}`
    );

export const getFeedbackContents = async ({ orgId }) =>
    postJson(FEEDBACK_LIST_ROUTE, { OrgId: orgId });

export const saveFeedbackContent = async ({ orgId, userId, content }) =>
    postJson("CFM/SaveFeedbackMasters", {
        OrgId: orgId,
        UserId: userId,
        Action: "CONTENT",
        JsonData: {
            Id: Number(content.Id) || 0,
            TypeId: Number(content.TypeId),
            ContentText: String(content.ContentText || "").trim(),
            IsDefault: content.IsDefault ? 1 : 0,
            IsRequired: content.IsRequired ? 1 : 0,
            DisplayOrder:
                content.DisplayOrder === null ||
                content.DisplayOrder === undefined ||
                content.DisplayOrder === ""
                    ? null
                    : Number(content.DisplayOrder),
        },
    });

export const getFeedbackRequests = async ({ orgId, customerId }) =>
    postJson("CFM/GetRequests", {
        OrgId: orgId,
        JsonData: { CustomerId: Number(customerId) },
    });

export const getAvailablePeriods = async ({ orgId, customerId, year }) =>
    postJson("CFM/GetAvailablePeriods", {
        OrgId: orgId,
        JsonData: { CustomerId: Number(customerId), Year: Number(year) },
    });

export const FEEDBACK_REQUEST_ACTIONS = {
    create: "CreateRequest",
    edit: "EditRequestForm",
};

export const REQUEST_STATUS = {
    DRAFT: "DRAFT",
    EMAIL_SENT: "EMAIL_SENT",
    FEEDBACK_RECEIVED: "FEEDBACK_RECEIVED",
};

export const REQUEST_STATUS_FLOW = [
    REQUEST_STATUS.DRAFT,
    REQUEST_STATUS.EMAIL_SENT,
    REQUEST_STATUS.FEEDBACK_RECEIVED,
];

export const LOCKED_STATUSES = [REQUEST_STATUS.FEEDBACK_RECEIVED, "CLOSED", "EXPIRED"];

export const normalizeStatus = (status) =>
    String(status || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

export const isLockedStatus = (status) => LOCKED_STATUSES.includes(normalizeStatus(status));

export const getPublicFeedbackForm = async ({ orgId, publicCode }) =>
    postJson("CFM/GetPublicFeedbackForm", {
        OrgId: orgId,
        JsonData: { PublicCode: String(publicCode) },
    });

export const getDefaultContentForEdit = async ({ orgId, requestId }) =>
    postJson("CFM/GetDefaultContentForEdit", {
        OrgId: orgId,
        JsonData: { RequestId: Number(requestId) },
    });

export const getAdditionalContentForEdit = async ({ orgId, requestId }) =>
    postJson("CFM/GetAdditionalContentForEdit", {
        OrgId: orgId,
        JsonData: { RequestId: Number(requestId) },
    });

export const saveRequestSetup = async ({
    orgId,
    userId,
    mode = "create",
    requestId = 0,
    customerId,
    feedbackPeriod,
    items,
}) => {
    const action = FEEDBACK_REQUEST_ACTIONS[mode];

    if (!action) {
        throw new Error(
            `No save action configured for "${mode}" — set FEEDBACK_REQUEST_ACTIONS.${mode} in cfmServices.js`
        );
    }

    return postJson("CFM/SaveFeedbackRequest", {
        OrgId: orgId,
        UserId: userId,
        Action: action,
        RequestId: Number(requestId) || 0,
        RequestJson:
            mode === "edit"
                ? null
                : {
                      CustomerId: Number(customerId),
                      FeedbackPeriod: feedbackPeriod,
                  },
        ItemsJson: items,
    });
};

export const PUBLIC_FORM_BASE = "https://feedback.cooperwind.online/";

export const publicFormUrl = (publicCode) =>
    publicCode ? `${PUBLIC_FORM_BASE}?${encodeURIComponent(publicCode)}` : "";

// The sending organisation, from the logged-in session — never hard-coded,
// so the module carries each client's own name, logo and email.
//   OrgName "CWIIT", OrgURL "1770133047323-cwilogo.png", OrgEmail "..."
// OrgURL is a file name served from the image base (or already a full URL).
export const orgBrandingOf = (sessionUserData = {}, imageBase = "") => {
    const logoPath = String(sessionUserData.OrgURL || "").trim();

    return {
        name: String(sessionUserData.OrgName || "").trim(),
        email: String(sessionUserData.OrgEmail || "").trim(),
        logoUrl: !logoPath
            ? ""
            : /^https?:\/\//i.test(logoPath)
            ? logoPath
            : `${imageBase}${encodeURI(logoPath.replace(/^\//, ""))}`,
    };
};

// Embed the customer's logo in the email instead of linking it. Linked images are
// held back by Outlook ("Some content in this message has been blocked")
// until the reader trusts the sender; embedded ones show straight away.
// Needs SendFeedbackEmail to read InlineImages — leave false until it does,
// or the logo won't show at all.
export const EMAIL_INLINE_IMAGES = false;

export const sendFeedbackEmail = async ({
    orgId,
    userId,
    requestId,
    toEmail,
    cc = "",
    subject,
    html,
    fromEmail,
    attachments = [],
    inlineImages = [],
}) => {
    const formData = new FormData();

    formData.append("OrgId", orgId);
    formData.append("UserId", userId);
    formData.append("RequestId", Number(requestId));
    formData.append("ToEmail", toEmail);
    formData.append("CC", cc);
    formData.append("Subject", subject);
    formData.append("Html", html);
    formData.append("FromEmail", fromEmail);

    attachments.forEach((file) => formData.append("Attachments", file));

    // [{ Cid, Url }] — pictures to embed; the Html refers to them as cid:<Cid>.
    if (inlineImages.length) {
        formData.append("InlineImages", JSON.stringify(inlineImages));
    }

    const response = await fetchWithAuth("CFM/SendFeedbackEmail", {
        method: "POST",
        body: formData,
    });

    return response.json();
};

export const PUBLIC_FEEDBACK_ACTION = "SubmitResponse";

export const submitFeedbackResponse = async ({
    orgId,
    userId = 0,
    requestId,
    respondentName,
    respondentEmail,
    answers = [],
}) =>
    postJson("CFM/SaveFeedbackRequest", {
        OrgId: orgId,
        UserId: userId,
        Action: PUBLIC_FEEDBACK_ACTION,
        RequestId: Number(requestId),
        RequestJson: {
            RespondentName: String(respondentName || "").trim(),
            RespondentEmail: String(respondentEmail || "").trim(),
        },
        ItemsJson: answers.map((item) => ({
            Id: Number(item.id),
            Answer: String(item.answer),
        })),
    });

export const readObject = (response) => {
    const data = response?.data;
    if (data && typeof data === "object" && !Array.isArray(data)) return data;
    if (Array.isArray(data) && data.length) return data[0];
    return null;
};

export const readRows = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.ResultData)) return response.ResultData;
    if (Array.isArray(response?.data?.ResultData)) return response.data.ResultData;
    return [];
};

export const readResult = (response) => {
    const inner =
        (Array.isArray(response?.data?.result) && response.data.result[0]) ||
        (Array.isArray(response?.result) && response.result[0]) ||
        null;

    // { ResultData: { ResultMessage, Status: "Success" } }
    const resultData =
        response?.ResultData && !Array.isArray(response.ResultData) ? response.ResultData : null;

    if (resultData && resultData.Status !== undefined) {
        return {
            ok: /^success/i.test(String(resultData.Status).trim()),
            message: resultData.ResultMessage || resultData.Message || "",
            code: /^success/i.test(String(resultData.Status).trim()) ? 1 : 0,
            data: resultData,
        };
    }

    const innerCode = inner ? inner.ResponseCode ?? inner.responseCode : undefined;

    if (innerCode !== undefined && innerCode !== null) {
        const code = Number(innerCode);

        return {
            ok: code === 1 || code === 200,
            message: inner.Message || inner.responseMessage || inner.ResponseMessage || "",
            code,
            data: inner,
        };
    }

    const code = Number(response?.status ?? 0);

    return {
        ok: code === 200 || response?.result === "success" || response?.success === true,
        message:
            response?.response ||
            response?.message ||
            inner?.Message ||
            inner?.responseMessage ||
            "",
        code,
        data: inner,
    };
};