// Validation functions
function validateName(name) {
    const regex = /^[A-Za-zÀ-ÿ\-']{2,20}$/; 
    if (!regex.test(name)) {
        return { 
            isValid: false,
            error: "Invalid name. Please enter a name between 2 and 20 characters, containing only letters, accents, hyphens, and apostrophes."
        };
    }
    return { isValid: true, value: name };
}

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

function validatePhone(phone) {
    const regex = /^0\d{10}$/; 
    if (!regex.test(phone)) {
        return {
            isValid: false,
            error: "Invalid phone number. Please enter a valid UK phone number starting with 0, containing exactly 11 digits."
        };
    }
    return { isValid: true, value: phone };
}

function validatePassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,20}$/;
    if (!regex.test(password)) {
        return {
            isValid: false,
            error: "Invalid password. Password must be 8-20 characters long, containing at least one number, one uppercase letter, one lowercase letter, and one special character (@, $, !, %, *, ?, &, .)."
        };
    }
    return { isValid: true, value: password };
}

function validateTitle(title) {
    const regex = /^[A-Za-z0-9\s.,'-:;&£$(){}[]+-=@]{1,100}$/;
    if (!regex.test(title)) {
        return {
            isValid: false,
            error: "Invalid title. Title must be 1-100 characters long."
        };
    }
    return { isValid: true, value: title };
}

function validateDesc(desc) {
    const regex = /^[A-Za-z0-9\s.,'-:;&£$(){}[]+-=@]{1,600}$/;
    if (!regex.test(title)) {
        return {
            isValid: false,
            error: "Invalid description. Description must be 1-600 characters long."
        };
    }
    return { isValid: true, value: desc };
}

function validateDeadline(deadline) {
    const currentDate = new Date();
    const deadlineDate = new Date(deadline);
    const maxDate = new Date();
    maxDate.setDate(currentDate.getDate() + 30);

    if (isNaN(deadlineDate.getTime())) {
        return {
            isValid: false,
            error: "Invalid deadline. Please enter a valid date and time."
        };
    } else if (deadlineDate < currentDate) {
        return {
            isValid: false,
            error: "Invalid deadline. Deadline cannot be earlier than the current date."
        };
    } else if (deadlineDate > maxDate) {
        return {
            isValid: false,
            error: "Invalid deadline. Deadline cannot be later than 30 days from the current date."
        };
    }

    return { isValid: true, value: deadline };
}

module.exports = {
    validateName,
    validateUsername,
    validateEmail,
    validatePhone,
    validatePassword,
    validateTitle,
    validateDesc,
    validateDeadline
};