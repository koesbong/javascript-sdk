/*
* Kontagent class constructor
*
* @constructor
*
* @param {string} apiKey The app's Kontagent API key
* @param {object} [optionalParams] An object containing paramName => value
* @param {bool} [optionalParams.useTestServer] Whether to send messages to the Kontagent Test Server
* @param {bool} [optionalParams.validateParams] Whether to validate the parameters passed into the tracking method
*/
function KontagentApi(apiKey, optionalParams) 
{
    this._sdkVersion = "j00";

    this._baseApiUrl = "http://api.geo.kontagent.net/api/v1/";
    this._baseHttpsApiUrl = "https://api.geo.kontagent.net/api/v1/";
    this._baseTestServerUrl = "http://test-server.kontagent.com/api/v1/";

    this._apiKey = apiKey;

    // this flag represents whether a message has been fired off yet.
    this._hasSentMessage = false; 

    if (optionalParams) {
        this._useTestServer = (optionalParams.useTestServer) ? optionalParams.useTestServer : false;
        this._useHttps = (optionalParams.useHttps) ? optionalParams.useHttps : false;
        this._validateParams = (optionalParams.validateParams) ? optionalParams.validateParams : false;
    }
}

/*
* Converts a string to the base-64 encoded version of the string.
*
* @param {string} data The data string to be encoded
*
* @return {string} The base64 encoded string
*/
KontagentApi.prototype._base64Encode = function(data) 
{
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        enc = "",
        tmp_arr = [];
 
    if (!data) {
        return data;
    }
 
    data = this._utf8Encode(data + '');
 
    do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);
 
        bits = o1 << 16 | o2 << 8 | o3;
 
        h1 = bits >> 18 & 0x3f;
        h2 = bits >> 12 & 0x3f;
        h3 = bits >> 6 & 0x3f;
        h4 = bits & 0x3f;
 
        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);
 
    enc = tmp_arr.join('');
    
    var r = data.length % 3;
    
    return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
}

/*
* Converts a string to the UTF-8 encoded version of the string.
*
* @param {string} argString The data string to be encoded
*
* @return {string} The UTF-8 encoded string
*/
KontagentApi.prototype._utf8Encode = function(argString) 
{
    if (!argString) {
        return "";
    }

    var string = (argString + ''); // .replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    var utftext = '',
        start, end, stringl = 0;

    start = end = 0;
    stringl = string.length;
    for (var n = 0; n < stringl; n++) {
        var c1 = string.charCodeAt(n);
        var enc = null;

        if (c1 < 128) {
            end++;
        } else if (c1 > 127 && c1 < 2048) {
            enc = String.fromCharCode((c1 >> 6) | 192, (c1 & 63) | 128);
        } else {
            enc = String.fromCharCode((c1 >> 12) | 224, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128);
        }
        if (enc !== null) {
            if (end > start) {
                utftext += string.slice(start, end);
            }
            utftext += enc;
            start = end = n + 1;
        }
    }

    if (end > start) {
        utftext += string.slice(start, stringl);
    }

    return utftext;
}

/*
* Sends an HTTP request by creating an <img> tag given a URL.
*
* @param {string} url The request URL
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
*/
KontagentApi.prototype._sendHttpRequestViaImgTag = function(url, successCallback)
{
    var img = new Image();
    
    // The onerror callback will always be triggered because no image header is returned by our API.
    // Which is fine because the request would have still gone through.
    if (successCallback) {
        img.onerror = successCallback;
        img.onload = successCallback;
    }

    img.src = url;
}

/*
* Sends the API message by creating an <img> tag.
*
* @param {string} messageType The message type to send ('apa', 'ins', etc.)
* @param {object} params An object containing 'paramName': 'value' (ex: 's': '123456789')
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype._sendMessage = function(messageType, params, successCallback, validationErrorCallback) {
    var result, url;

    // append the version if this is the first message
    if (!this._hasSentMessage) {
        params['sdk'] = this._sdkVersion;
        this.hasSentMessage = true;
    }

    // add a timestamp param to prevent browser caching
    params['ts'] =  new Date().getTime();

    if (this._validateParams) {
        for (var paramKey in params) {
            result = KtValidator.validateParameter(messageType, paramKey, params[paramKey]);

            if (!result) {
                if (validationErrorCallback) {
                    validationErrorCallback(result);
                }

                return;
            }
        }
    }   

    if (this._useTestServer) {
        url = this._baseTestServerUrl + this._apiKey + "/" + messageType + "/?" + this._httpBuildQuery(params);
    } else {
        if (this._useHttps) {
            url = this._baseHttpsApiUrl + this._apiKey + "/" + messageType + "/?" + this._httpBuildQuery(params);
        } else {
            url = this._baseApiUrl + this._apiKey + "/" + messageType + "/?" + this._httpBuildQuery(params);
        }
    }

    this._sendHttpRequestViaImgTag(url, successCallback);
}

/*
* Generate URL-encoded query string (same as PHP's http_build_query())
*
* @param {object} data The object containing key, value data to encode
*
* @return {string) A URL-encoded string
*/
KontagentApi.prototype._httpBuildQuery = function(data) {
    var query, key, val;
    var tmpArray = [];

    for(key in data) {
        val = encodeURIComponent(decodeURIComponent(data[key].toString()));
        key = encodeURIComponent(decodeURIComponent(key));

        tmpArray.push(key + "=" + val);  
    }

    return tmpArray.join("&");
}

/*
* Returns random 4-character hex
*
* @return {string} Random 4-character hex value
*/
KontagentApi.prototype._s4 = function() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
}

/*
* Generates a unique tracking tag.
*
*  @return {string} The unique tracking tag
*/
KontagentApi.prototype.genUniqueTrackingTag = function() {
    var uniqueTrackingTag = "";
    
    for(var i = 0; i < 4; i++) {
        uniqueTrackingTag += this._s4();
    }
    
    return uniqueTrackingTag;
}

/*
* Generates a short unique tracking tag.
*
*  @return {string} The short unique tracking tag
*/
KontagentApi.prototype.genShortUniqueTrackingTag = function() {
    var shortUniqueTrackingTag = "";
    
    for(var i = 0; i < 2; i++) {
        shortUniqueTrackingTag += this._s4();
    }
    
    return shortUniqueTrackingTag;
}

/*
* Sends an Invite Sent message to Kontagent.
*
* @param {int} userId The UID of the sending user
* @param {string} recipientUserIds A comma-separated list of the recipient UIDs
* @param {string} uniqueTrackingTag 32-digit hex string used to match 
*   InviteSent->InviteResponse->ApplicationAdded messages. 
*   See the genUniqueTrackingTag() helper method.
* @param {object} [optionalParams] An object containing 'paramName': 'value'
* @param {string} [optionalParams.subtype1] Subtype1 value (max 32 chars)
* @param {string} [optionalParams.subtype2] Subtype2 value (max 32 chars)
* @param {string} [optionalParams.subtype3] Subtype3 value (max 32 chars)
* @param {string} [optionalParams.data] Additional JSON-formatted data to associate with the message
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype.trackInviteSent = function(userId, recipientUserIds, uniqueTrackingTag, optionalParams, successCallback, validationErrorCallback) {
    var apiParams = {
        s : userId,
        r : recipientUserIds,
        u : uniqueTrackingTag
    };
    
    if (optionalParams) {
        apiParams.st1 = optionalParams.subtype1;
        apiParams.st2 = optionalParams.subtype2;
        apiParams.st3 = optionalParams.subtype3;
        apiParams.data = this._base64Encode(optionalParams.data);
    }

    this._sendMessage("ins", apiParams, successCallback, validationErrorCallback);
}

/*
* Sends an Invite Response message to Kontagent.
*
* @param {string} uniqueTrackingTag 32-digit hex string used to match 
*   InviteSent->InviteResponse->ApplicationAdded messages. 
*   See the genUniqueTrackingTag() helper method.
* @param {object} [optionalParams] An object containing 'paramName': 'value'
* @param {string} [optionalParams.recipientUserId] The UID of the responding user
* @param {string} [optionalParams.subtype1] Subtype1 value (max 32 chars)
* @param {string} [optionalParams.subtype2] Subtype2 value (max 32 chars)
* @param {string} [optionalParams.subtype3] Subtype3 value (max 32 chars)
* @param {string} [optionalParams.data] Additional JSON-formatted data to associate with the message
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype.trackInviteResponse = function(uniqueTrackingTag, optionalParams, successCallback, validationErrorCallback) {
    var apiParams = {
        i : 0,
        u : uniqueTrackingTag
    };
    
    if (optionalParams) {
        apiParams.r = optionalParams.recipientUserId;
        apiParams.st1 = optionalParams.subtype1;
        apiParams.st2 = optionalParams.subtype2;
        apiParams.st3 = optionalParams.subtype3;
        apiParams.data = this._base64Encode(optionalParams.data);
    }   
    
    this._sendMessage("inr", apiParams, successCallback, validationErrorCallback);
}

/*
* Sends an Notification Sent message to Kontagent.
*
* @param {int} userId The UID of the sending user
* @param {string} recipientUserIds A comma-separated list of the recipient UIDs
* @param {string} uniqueTrackingTag 32-digit hex string used to match 
*   NotificationSent->NotificationResponse->ApplicationAdded messages. 
*   See the genUniqueTrackingTag() helper method.
* @param {object} [optionalParams] An object containing 'paramName': 'value'
* @param {string} [optionalParams.subtype1] Subtype1 value (max 32 chars)
* @param {string} [optionalParams.subtype2] Subtype2 value (max 32 chars)
* @param {string} [optionalParams.subtype3] Subtype3 value (max 32 chars)
* @param {string} [optionalParams.data] Additional JSON-formatted data to associate with the message
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype.trackNotificationSent = function(userId, recipientUserIds, uniqueTrackingTag, optionalParams, successCallback, validationErrorCallback) {
    var apiParams = {
        s : userId,
        r : recipientUserIds,
        u : uniqueTrackingTag
    };
    
    if (optionalParams) {
        apiParams.st1 = optionalParams.subtype1;
        apiParams.st2 = optionalParams.subtype2;
        apiParams.st3 = optionalParams.subtype3;
        apiParams.data = this._base64Encode(optionalParams.data);
    }
    
    this._sendMessage("nts", apiParams, successCalback, validationErrorCallback);
}

/*
* Sends an Notification Response message to Kontagent.
*
* @param {string} uniqueTrackingTag 32-digit hex string used to match 
*   NotificationSent->NotificationResponse->ApplicationAdded messages. 
*   See the genUniqueTrackingTag() helper method.
* @param {object} [optionalParams] An object containing 'paramName': 'value'
* @param {string} [optionalParams.recipientUserId] The UID of the responding user
* @param {string} [optionalParams.subtype1] Subtype1 value (max 32 chars)
* @param {string} [optionalParams.subtype2] Subtype2 value (max 32 chars)
* @param {string} [optionalParams.subtype3] Subtype3 value (max 32 chars)
* @param {string} [optionalParams.data] Additional JSON-formatted data to associate with the message
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype.trackNotificationResponse = function(uniqueTrackingTag, optionalParams, successCallback, validationErrorCallback) {
    var apiParams = {
        i : 0,
        u : uniqueTrackingTag
    };
    
    if (optionalParams) {
        apiParams.r = optionalParams.recipientUserId;
        apiParams.st1 = optionalParams.subtype1;
        apiParams.st2 = optionalParams.subtype2;
        apiParams.st3 = optionalParams.subtype3;
        apiParams.data = this._base64Encode(optionalParams.data);
    }
    
    this._sendMessage("ntr", apiParams, successCallback, validationErrorCallback);
}

/*
* Sends an Notification Email Sent message to Kontagent.
*
* @param {int} userId The UID of the sending user
* @param {string} recipientUserIds A comma-separated list of the recipient UIDs
* @param {string} uniqueTrackingTag 32-digit hex string used to match 
*   NotificationEmailSent->NotificationEmailResponse->ApplicationAdded messages. 
*   See the genUniqueTrackingTag() helper method.
* @param {object} [optionalParams] An object containing 'paramName': 'value'
* @param {string} [optionalParams.subtype1] Subtype1 value (max 32 chars)
* @param {string} [optionalParams.subtype2] Subtype2 value (max 32 chars)
* @param {string} [optionalParams.subtype3] Subtype3 value (max 32 chars)
* @param {string} [optionalParams.data] Additional JSON-formatted data to associate with the message
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype.trackNotificationEmailSent = function(userId, recipientUserIds, uniqueTrackingTag, optionalParams, successCallback, validationErrorCallback) {
    var apiParams = {
        s : userId,
        r : recipientUserIds,
        u : uniqueTrackingTag
    };
    
    if (optionalParams) {
        apiParams.st1 = optionalParams.subtype1;
        apiParams.st2 = optionalParams.subtype2;
        apiParams.st3 = optionalParams.subtype3;
        apiParams.data = this._base64Encode(optionalParams.data);
    }

    this._sendMessage("nes", apiParams, successCallback, validationErrorCallback);
}

/*
* Sends an Notification Email Response message to Kontagent.
*

* @param {string} uniqueTrackingTag 32-digit hex string used to match 
*   NotificationEmailSent->NotificationEmailResponse->ApplicationAdded messages. 
*   See the genUniqueTrackingTag() helper method.
* @param {object} [optionalParams] An object containing 'paramName': 'value'
* @param {string} [optionalParams.recipientUserId] The UID of the responding user
* @param {string} [optionalParams.subtype1] Subtype1 value (max 32 chars)
* @param {string} [optionalParams.subtype2] Subtype2 value (max 32 chars)
* @param {string} [optionalParams.subtype3] Subtype3 value (max 32 chars)
* @param {string} [optionalParams.data] Additional JSON-formatted data to associate with the message
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype.trackNotificationEmailResponse = function(uniqueTrackingTag, optionalParams, successCallback, validationErrorCallback) {
    var apiParams = {
        i : 0,
        u : uniqueTrackingTag
    };
    
    if (optionalParams) {
        apiParams.r = optionalParams.recipientUserId;
        apiParams.st1 = optionalParams.subtype1;
        apiParams.st2 = optionalParams.subtype2;
        apiParams.st3 = optionalParams.subtype3;
        apiParams.data = this._base64Encode(optionalParams.data);
    }
    
    this._sendMessage("nei", apiParams, successCallback, validationErrorCallback);
}

/*
* Sends an Stream Post message to Kontagent.
*
* @param {int} userId The UID of the sending user
* @param {string} uniqueTrackingTag 32-digit hex string used to match 
*   NotificationEmailSent->NotificationEmailResponse->ApplicationAdded messages. 
*   See the genUniqueTrackingTag() helper method.
* @param {string} type The Facebook channel type
*   (feedpub, stream, feedstory, multifeedstory, dashboard_activity, or dashboard_globalnews).
* @param {object} [optionalParams] An object containing 'paramName': 'value'
* @param {string} [optionalParams.subtype1] Subtype1 value (max 32 chars)
* @param {string} [optionalParams.subtype2] Subtype2 value (max 32 chars)
* @param {string} [optionalParams.subtype3] Subtype3 value (max 32 chars)
* @param {string} [optionalParams.data] Additional JSON-formatted data to associate with the message
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype.trackStreamPost = function(userId, uniqueTrackingTag, type, optionalParams, successCallback, validationErrorCallback) {
    var apiParams = {
        s : userId,
        u : uniqueTrackingTag,
        tu : type
    };
    
    if (optionalParams) {
        apiParams.st1 = optionalParams.subtype1;
        apiParams.st2 = optionalParams.subtype2;
        apiParams.st3 = optionalParams.subtype3;
        apiParams.data = this._base64Encode(optionalParams.data);
    }

    this._sendMessage("pst", apiParams, successCallback, validationErrorCallback);
}

/*
* Sends an Stream Post Response message to Kontagent.
*
* @param {string} uniqueTrackingTag 32-digit hex string used to match 
*   NotificationEmailSent->NotificationEmailResponse->ApplicationAdded messages. 
*   See the genUniqueTrackingTag() helper method.
* @param {string} type The Facebook channel type
*   (feedpub, stream, feedstory, multifeedstory, dashboard_activity, or dashboard_globalnews).
* @param {object} [optionalParams] An object containing 'paramName': 'value'
* @param {string} [optionalParams.recipientUserId] The UID of the responding user
* @param {string} [optionalParams.subtype1] Subtype1 value (max 32 chars)
* @param {string} [optionalParams.subtype2] Subtype2 value (max 32 chars)
* @param {string} [optionalParams.subtype3] Subtype3 value (max 32 chars)
* @param {string} [optionalParams.data] Additional JSON-formatted data to associate with the message
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype.trackStreamPostResponse = function(uniqueTrackingTag, type, optionalParams, successCallback, validationErrorCallback) {
    var apiParams = {
        i : 0,
        u : uniqueTrackingTag,
        tu : type
    };
    
    if (optionalParams) {
        apiParams.r = optionalParams.recipientUserId;
        apiParams.st1 = optionalParams.subtype1;
        apiParams.st2 = optionalParams.subtype2;
        apiParams.st3 = optionalParams.subtype3;
        apiParams.data = this._base64Encode(optionalParams.data);
    }

    this._sendMessage("psr", apiParams, successCallback, validationErrorCallback);
}

/*
* Sends an Custom Event message to Kontagent.
*
* @param {int} userId The UID of the user
* @param {string} eventName The name of the event
* @param {object} [optionalParams] An object containing 'paramName': 'value'
* @param {int} [optionalParams.value] A value associated with the event
* @param {int} [optionalParams.level] A level associated with the event (must be positive)
* @param {string} [optionalParams.subtype1] Subtype1 value (max 32 chars)
* @param {string} [optionalParams.subtype2] Subtype2 value (max 32 chars)
* @param {string} [optionalParams.subtype3] Subtype3 value (max 32 chars)
* @param {string} [optionalParams.data] Additional JSON-formatted data to associate with the message
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype.trackEvent = function(userId, eventName, optionalParams, successCallback, validationErrorCallback) {
    var apiParams = {
        s : userId,
        n : eventName
    };

    if (optionalParams) {
        apiParams.v = optionalParams.value;
        apiParams.l = optionalParams.level;
        apiParams.st1 = optionalParams.subtype1;
        apiParams.st2 = optionalParams.subtype2;
        apiParams.st3 = optionalParams.subtype3;
        apiParams.data = this._base64Encode(optionalParams.data);
    }

    this._sendMessage("evt", apiParams, successCallback, validationErrorCallback);
}

/*
* Sends an Application Added message to Kontagent.
*
* @param {int} userId The UID of the installing user
* @param {object} [optionalParams] An object containing 'paramName': 'value'
* @param {string} [optionalParams.uniqueTrackingTag] 16-digit hex string used to match 
*   Invite/StreamPost/NotificationSent/NotificationEmailSent->ApplicationAdded messages. 
*   See the genUniqueTrackingTag() helper method.
* @param {string} [optionalParams.shortUniqueTrackingTag] 8-digit hex string used to match 
*   ThirdPartyCommClicks->ApplicationAdded messages. 
*   See the genShortUniqueTrackingTag() hesendMessagelper method.
* @param {string} [optionalParams.data] Additional JSON-formatted data to associate with the message
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype.trackApplicationAdded = function(userId, optionalParams, successCallback, validationErrorCallback) {
    var apiParams = {s : userId};

    if (optionalParams) {
        apiParams.u = optionalParams.uniqueTrackingTag;
        apiParams.su = optionalParams.shortUniqueTrackingTag;
        apiParams.data = this._base64Encode(optionalParams.data);
    }

    this._sendMessage("apa", apiParams, successCallback, validationErrorCallback);
}

/*
* Sends an Application Removed message to Kontagent.


*
* @param {int} userId The UID of the removing user
* @param {object} [optionalParams] An object containing 'paramName': 'value'
* @param {string} [optionalParams.data] Additional JSON-formatted data to associate with the message
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype.trackApplicationRemoved = function(userId, optionalParams, successCallback, validationErrorCallback) {
    var apiParams = {s : userId};

    if (optionalParams) {
        apiParams.data = this._base64Encode(optionalParams.data);
    }
    
    this._sendMessage("apr", apiParams, successCallback, validationErrorCallback);
}

/*
* Sends an Third Party Communication Click message to Kontagent.
*
* @param {string} type The third party comm click type (ad, partner).
* @param {string} shortUniqueTrackingTag 8-digit hex string used to match 
*   ThirdPartyCommClicks->ApplicationAdded messages. 
* @param {object} [optionalParams] An object containing 'paramName': 'value'
* @param {string} [optionalParams.userId] The UID of the user
* @param {string} [optionalParams.subtype1] Subtype1 value (max 32 chars)
* @param {string} [optionalParams.subtype2] Subtype2 value (max 32 chars)
* @param {string} [optionalParams.subtype3] Subtype3 value (max 32 chars)
* @param {string} [optionalParams.data] Additional JSON-formatted data to associate with the message
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype.trackThirdPartyCommClick = function(type, shortUniqueTrackingTag, optionalParams, successCallback, validationErrorCallback) {
    var apiParams = {
        i : 0,
        tu : type,
        su : shortUniqueTrackingTag
    };

    if (optionalParams) {
        apiParams.s = optionalParams.userId;
        apiParams.st1 = optionalParams.subtype1;
        apiParams.st2 = optionalParams.subtype2;
        apiParams.st3 = optionalParams.subtype3;
        apiParams.data = this._base64Encode(optionalParams.data);
    }
    
    this._sendMessage("ucc", apiParams, successCallback, validationErrorCallback);
}

/*
* Sends an Page Request message to Kontagent.
*
* @param {int} userId The UID of the user
* @param {object} [optionalParams] An object containing 'paramName': 'value'
* @param {string} [optionalParams.ipAddress] The current users IP address
* @param {string} [optionalParams.pageAddress] The current page address (ex: index.html)
* @param {string} [optionalParams.data] Additional JSON-formatted data to associate with the message
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype.trackPageRequest = function(userId, optionalParams, successCallback, validationErrorCallback) {
    var apiParams = {
        s : userId
    };

    if (optionalParams) {
        apiParams.ip = optionalParams.ipAddress;
        apiParams.u = optionalParams.pageAddress;
        apiParams.data = this._base64Encode(optionalParams.data);
    }

    this._sendMessage("pgr", apiParams, successCallback, validationErrorCallback);
}

/*
* Sends an User Information message to Kontagent.
*
* @param {int} userId The UID of the user
* @param {object} [optionalParams] An object containing 'paramName': 'value'
* @param {int} [optionalParams.birthYear] The birth year of the user
* @param {string} [optionalParams.gender] The gender of the user (m,f,u)
* @param {string} [optionalParams.country] The 2-character country code of the user
* @param {int} [optionalParams.friendCount] The friend count of the user
* @param {string} [optionalParams.data] Additional JSON-formatted data to associate with the message
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype.trackUserInformation = function (userId, optionalParams, successCallback, validationErrorCallback) {
    var apiParams = {s : userId};

    if (optionalParams) {
        apiParams.b = optionalParams.birthYear;
        apiParams.g = optionalParams.gender;
        apiParams.lc = optionalParams.country;
        apiParams.f = optionalParams.friendCount;
        apiParams.data = this._base64Encode(optionalParams.data);
    }
    
    this._sendMessage("cpu", apiParams, successCallback, validationErrorCallback);
}

/*
* Sends an Goal Count message to Kontagent.
*
* @param {int} userId The UID of the user
* @param {object} [optionalParams] An object containing 'paramName': 'value'
* @param {int} [optionalParams.goalCount1] The amount to increment goal count 1 by
* @param {int} [optionalParams.goalCount2] The amount to increment goal count 2 by
* @param {int} [optionalParams.goalCount3] The amount to increment goal count 3 by
* @param {int} [optionalParams.goalCount4] The amount to increment goal count 4 by
* @param {string} [optionalParams.data] Additional JSON-formatted data to associate with the message
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype.trackGoalCount = function(userId, optionalParams, successCallback, validationErrorCallback) {
    var apiParams = {s : userId};

    if (optionalParams) {
        apiParams.gc1 = optionalParams.goalCount1;
        apiParams.gc2 = optionalParams.goalCount2;
        apiParams.gc3 = optionalParams.goalCount3;
        apiParams.gc4 = optionalParams.goalCount4;
        apiParams.data = this._base64Encode(optionalParams.data);
    }

    this._sendMessage("gci", apiParams, successCallback, validationErrorCallback);
}

/*
* Sends an Revenue message to Kontagent.
*
* @param {int} userId The UID of the user
* @param {int} value The amount of revenue in cents
* @param {object} [optionalParams] An object containing 'paramName': 'value'
* @param {string} [optionalParams.type] The transaction type (direct, indirect, advertisement, credits, other)
* @param {string} [optionalParams.subtype1] Subtype1 value (max 32 chars)
* @param {string} [optionalParams.subtype2] Subtype2 value (max 32 chars)
* @param {string} [optionalParams.subtype3] Subtype3 value (max 32 chars)
* @param {string} [optionalParams.data] Additional JSON-formatted data to associate with the message
* @param {function} [successCallback] The callback function to execute once message has been sent successfully
* @param {function(error)} [validationErrorCallback] The callback function to execute on validation failure
*/
KontagentApi.prototype.trackRevenue = function(userId, value, optionalParams, successCallback, validationErrorCallback) {
    var apiParams = {
        s : userId,
        v : value
    };

    if (optionalParams) {
        apiParams.tu = optionalParams.type;
        apiParams.st1 = optionalParams.subtype1;
        apiParams.st2 = optionalParams.subtype2;
        apiParams.st3 = optionalParams.subtype3;
        apiParams.data = this._base64Encode(optionalParams.data);
    }

    this._sendMessage("mtu", apiParams, successCallback, validationErrorCallback);
}

////////////////////////////////////////////////////////////////////////////////

/*
* Helper class to validate the paramters for the Kontagent API messages. All 
*   methods are static so no need to instantiate this class.
*
* @constructor
*/
function KtValidator() {
}

/*
* Validates a parameter of a given message type.
* IMPORTANT: When evaluating the return, use a strict-type comparison: if(response === true) {}
*
* @param {string} messageType The message type that the param belongs to (ex: ins, apa, etc.)
* @param {string} paramName The name of the parameter (ex: s, su, u, etc.)
* @param {mixed} paramValue The value of the parameter
*
* @returns {mixed} Returns true on success and an error message string on failure.
*/
KtValidator.validateParameter = function(messageType, paramName, paramValue) {
    return KtValidator['_validate' + KtValidator._upperCaseFirst(paramName)](messageType, paramName, paramValue);
}

KtValidator._upperCaseFirst = function(stringVal) {
    return stringVal.charAt(0).toUpperCase() + stringVal.slice(1);
}

KtValidator._validateB = function(messageType, paramName, paramValue) {
    // birthyear param (cpu message)
    if (paramValue && typeof paramValue === 'number' && paramValue > 1900 && paramValue < 2011) {
        return true;
    } else {
        return 'Invalid birth year.';
    }
}

KtValidator._validateData = function(messageType, paramName, paramValue) {
    return true;
}

KtValidator._validateF = function(messageType, paramName, paramValue) {
    // friend count param (cpu message)
    if (paramValue && typeof paramValue === 'number' && paramValue >= 0) {
        return true;
    } else {
        return 'Invalid friend count.';
    }
}

KtValidator._validateG = function(messageType, paramName, paramValue) { 
    // gender param (cpu message)
    var regex = /^[mfu]$/;

    if (paramValue && regex.test(paramValue)) {
        return true;
    } else {
        return 'Invalid gender.';
    }
}

KtValidator._validateGc1 = function(messageType, paramName, paramValue) {
    // goal count param (gc1, gc2, gc3, gc4 messages)
    if (typeof paramValue !== 'undefined' && typeof paramValue === 'number' && paramValue > -16384 && paramValue < 16384) {
        return true;
    } else {
        return 'Invalid goal count value.';
    }
}

KtValidator._validateGc2 = function(messageType, paramName, paramValue) {
    return KtValidator._validateGc1(messageType, paramName, paramValue);
}

KtValidator._validateGc3 = function(messageType, paramName, paramValue) {
    return KtValidator._validateGc1(messageType, paramName, paramValue);
}

KtValidator._validateGc4 = function(messageType, paramName, paramValue) {
    return KtValidator._validateGc1(messageType, paramName, paramValue);
}

KtValidator._validateI = function(messageType, paramName, paramValue) {
    // isAppInstalled param (inr, psr, ner, nei messages)
    var regex = /^[01]$/;

    if (typeof paramValue !== 'undefined' && regex.test(paramValue)) {
        return true;
    } else {
        return 'Invalid isAppInstalled value.';
    }
}

KtValidator._validateIp = function(messageType, paramName, paramValue) {
    // ip param (pgr messages)
    var regex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\.\d{1,3})?$/; 

    if (paramValue && regex.test(paramValue)) {
        return true;
    } else {
        return 'Invalid IP address value.';
    }
}

KtValidator._validateL = function(messageType, paramName, paramValue) {
    // level param (evt messages)
    if (paramValue && typeof paramValue === 'number' && paramValue >= 0) {
        return true;
    } else {
        return 'Invalid level value.';
    }
}

KtValidator._validateLc = function(messageType, paramName, paramValue) {
    // country param (cpu messages)
    var regex = /^[A-Z]{2}$/;

    if (paramValue && regex.test(paramValue)) {
        return true;
    } else {
        return 'Invalid country value.';
    }
}

KtValidator._validateLp = function(messageType, paramName, paramValue) {
    // postal/zip code param (cpu messages)
    // this parameter isn't being used so we just return true for now
    return true;
}

KtValidator._validateLs = function(messageType, paramName, paramValue) {
    // state param (cpu messages)
    // this parameter isn't being used so we just return true for now
    return true;
}

KtValidator._validateN = function(messageType, paramName, paramValue) {
    // event name param (evt messages)
    var regex = /^[A-Za-z0-9-_]{1,32}$/;

    if (paramValue && regex.test(paramValue)) {
        return true;
    } else {
        return 'Invalid event name value.';
    }
}

KtValidator._validateR = function(messageType, paramName, paramValue) {
    // Sending messages include multiple recipients (comma separated) and
    // response messages can only contain 1 recipient UID.
    if (messageType === 'ins' || messageType === 'nes' || messageType === 'nts') {
        // recipients param (ins, nes, nts messages)
        var regex = /^[0-9]+(,[0-9]+)*$/;

        if (paramValue && regex.test(paramValue)) {
            return true;
        }
    } else if (messageType === 'inr' || messageType === 'psr' || messageType === 'nei' || messageType === 'ntr') {
        // recipient param (inr, psr, nei, ntr messages)
        if (paramValue && typeof paramValue === 'number') {
            return true;
        }
    }

    return 'Invalid recipient user id.';
}

KtValidator._validateS = function(messageType, paramName, paramValue) {
    // userId param
    if (paramValue && typeof paramValue === 'number') {
        return true;
    } else {
        return 'Invalid user id.';
    }
}

KtValidator._validateSdk = function(messageType, paramName, paramValue) {
    return true;
}

KtValidator._validateSt1 = function(messageType, paramName, paramValue) {
    // subtype1 param
    var regex = /^[A-Za-z0-9-_]{1,32}$/;

    if (paramValue && regex.test(paramValue)) {
        return true;
    } else {
        return 'Invalid subtype value.';
    }
}

KtValidator._validateSt2 = function(messageType, paramName, paramValue) {
    return KtValidator._validateSt1(messageType, paramName, paramValue);
}

KtValidator._validateSt3 = function(messageType, paramName, paramValue) {
    return KtValidator._validateSt1(messageType, paramName, paramValue);
}

KtValidator._validateSu = function(messageType, paramName, paramValue) {
    // short tracking tag param
    var regex = /^[A-Fa-f0-9]{8}$/;

    if (paramValue && regex.test(paramValue)) {
        return true;
    } else {
        return 'Invalid short unique tracking tag.';
    }
}

KtValidator._validateTs = function(messageType, paramName, paramValue) {
    // timestamp param (pgr message)
    if (paramValue && typeof paramValue === 'number') {
        return true;
    } else {
        return 'Invalid timestamp.';
    }
}

KtValidator._validateTu = function(messageType, paramName, paramValue) {
    // type parameter (mtu, pst/psr, ucc messages)
    // acceptable values for this parameter depends on the message type
    var regex;

    if (messageType === 'mtu') {
        regex = /^(direct|indirect|advertisement|credits|other)$/;
    
        if (!paramValue || !regex.test(paramValue)) {
            return 'Invalid monetization type.';
        }
    } else if (messageType === 'pst' || messageType === 'psr') {
        regex = /^(feedpub|stream|feedstory|multifeedstory|dashboard_activity|dashboard_globalnews)$/;

        if (!paramValue || !regex.test(paramValue)) {
            return 'Invalid stream post/response type.';
        }
    } else if (messageType === 'ucc') {
        regex = /^(ad|partner)$/;

        if (!paramValue || !regex.test(paramValue)) {
            return 'Invalid third party communication click type.';
        }
    }
    
    return true;
}

KtValidator._validateU = function(messageType, paramName, paramValue) {
    // unique tracking tag parameter for all messages EXCEPT pgr.
    // for pgr messages, this is the "page address" param
    if (messageType !== 'pgr') {
        var regex = /^[A-Fa-f0-9]{16}$/;

        if (!paramValue || !regex.test(paramValue)) {
            return 'Invalid unique tracking tag.';
        }
    }
    
    return true;
}

KtValidator._validateV = function(messageType, paramName, paramValue) {
    // value param (mtu, evt messages)
    if (paramValue && typeof paramValue === 'number') {
        return true;
    } else {
        return 'Invalid value.';
    }
}
