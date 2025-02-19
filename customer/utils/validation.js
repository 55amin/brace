// Validation functions
function validateUsername(username) {
    const regex = /^[A-Za-z0-9_]{6,20}$/; 
    if (!regex.test(username)) {
        return { 
            isValid: false,
            error: "Invalid username. Please enter a username between 6 and 20 characters, containing only letters, numbers and underscores."
        };
    }
    return { isValid: true, value: username };
}

function validateEmail(email) {
    const normalised = email.toLowerCase(); 
    
    if (normalised.length > 320) {
        return {
            isValid: false,
            error: "Email address is too long. Maximum length is 320 characters."
        };
    }

    const regex = /^[a-zA-Z0-9._%+-]{2,64}@[a-zA-Z0-9.-]{3,253}\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?$/;
    if (!regex.test(normalised)) {
        return {
            isValid: false,
            error: "Invalid email address. Please enter an email address in valid format (e.g., example@domain.com)."
        };
    }
    return { isValid: true, value: normalised };
}

function validateTitle(title) {
    const regex = /^[A-Za-z0-9\s.,'"\-:;&£$(){}[\]+=@!?*%\/|]{1,200}$/;
    if (!regex.test(title)) {
        return {
            isValid: false,
            error: "Invalid title. Title must be 1-200 characters long."
        };
    }
    return { isValid: true, value: title };
}

function validateDesc(desc) {
    const regex = /^[A-Za-z0-9\s.,'"\-:;&£$(){}[\]+=@!?*%\/|]{1,2000}$/;
    if (!regex.test(desc)) {
        return {
            isValid: false,
            error: "Invalid description. Description must be 1-2000 characters long."
        };
    }
    return { isValid: true, value: desc };
}

module.exports = {
    validateUsername,
    validateEmail,
    validateTitle,
    validateDesc,
};