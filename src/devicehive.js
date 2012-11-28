/*
* DeviceHive 1.0
* (c) 2012 DataArt
* MIT license
*
* Client library to access DeviceHive service.
*/

function DeviceHive(serviceUrl, login, password) {
    this.serviceUrl = serviceUrl;
    this.login = login;
    this.password = password;
}

DeviceHive.prototype = {

    // gets list of networks
    getNetworks: function() {
        return this.query("GET", "/network");
    },

    // gets information about network and associated devices
    getNetwork: function(networkId) {
        return this.query("GET", "/network/" + networkId);
    },

    // gets information about device
    getDevice: function(deviceId) {
        return this.query("GET", "/device/" + deviceId);
    },

    // gets information about device class and associated equipment
    getDeviceClass: function(deviceClassId) {
        return this.query("GET", "/device/class/" + deviceClassId);
    },

    // gets a list of device equipment states (current state of device equipment)
    getEquipmentState: function(deviceId) {
        return this.query("GET", "/device/" + deviceId + "/equipment");
    },

    // gets a list of notifications generated by the device
    getNotifications: function(deviceId, start, end) {
        var params = {};
        if (start) { params.start = this.formatDate(start); }
        if (end) { params.end = this.formatDate(end); }
        return this.query("GET", "/device/" + deviceId + "/notification", params);
    },

    // starts polling device notifications from the service
    // timestamp (optional) - specifies the date of last received notification
    // callback - function to handle incoming notifications (return false to stop polling)
    // fail - function to handle XHR errors (return false to stop polling)
    startNotificationPolling: function(deviceId, timestamp, callback, fail) {
        this.stopNotificationPolling();
        var that = this;
        var params = {};
        if (timestamp) { params.timestamp = this.formatDate(timestamp); }
        this.pollNotificationsXhr = this.query("GET", "/device/" + deviceId + "/notification/poll", params)
            .done(function (data, jqXhr) {
                var lastTimestamp = null;
                var continuePolling = true;
                if (data != null && data != "") {
                    jQuery.each(data, function (index, notification) {
                        if (!lastTimestamp || notification.timestamp > lastTimestamp) {
                            lastTimestamp = notification.timestamp;
                        }
                        if (callback && callback(notification) == false) {
                            continuePolling = false;
                            return false;
                        }
                    });
                }
                if (continuePolling) {
                    that.startNotificationPolling(deviceId, lastTimestamp || timestamp, callback, fail);
                }
            })
            .fail(function(response) {
                if (response.status != 0 && response.statusText != "The client stopped notification polling") {
                    if (!fail || fail(response) != false) {
                        setTimeout(function() { that.startNotificationPolling(deviceId, timestamp, callback, fail); }, 1000);
                    }
                }
            });
    },

    // stops polling device notifications from the service
    stopNotificationPolling: function() {
        if (this.pollNotificationsXhr != null) {
            this.pollNotificationsXhr.abort("The client stopped notification polling");
        }
    },

    // sends new command to the device.
    sendCommand: function(deviceId, command, parameters) {
        return this.query("POST", "/device/" + deviceId + "/command", { command: command, parameters: JSON.stringify(parameters) });
    },

    // private methods
    query: function(method, url, params) {
        var that = this;
        return jQuery.ajax({
            type: method,
            url: this.serviceUrl + url,
            dataType: "json",
            data: params,
            xhrFields: { withCredentials: true },
            beforeSend: function(jqXHR, settings) {
                jqXHR.setRequestHeader("Authorization", "Basic " + that.encodeBase64(that.login + ":" + that.password))
            }
        });
    },
    
    parseDate: function (date) {
        return new Date(date.substring(0, 4), parseInt(date.substring(5, 7), 10) - 1, date.substring(8, 10),
            date.substring(11, 13), date.substring(14, 16), date.substring(17, 19), date.substring(20, 23));
    },

    formatDate: function(date) {
        if (Object.prototype.toString.call(date) === '[object String]')
            return date; // already formatted string - do not modify

        if (Object.prototype.toString.call(date) !== '[object Date]')
            throw SyntaxError("Invalid object type");

        var pad = function(value, length) {
            value = String(value);
            length = length || 2;
            while (value.length < length)
                value = "0" + value;
            return value;
        };

        return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "T" +
            pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds()) + "." + pad(date.getMilliseconds(), 3);
    },

    encodeBase64: function (data) {
        var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc = "", tmp_arr = []; 
        if (!data) {
            return data;
        }
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
};
