// Apparently I can make custom importable libraries, time to abuse this :P
// Easily make http requests and posts

export class Requester {

    get WEB_ROOT() {
        return document.location.origin; 
    }

    relative_path(path) {
        if(path.length > 0) {
            return `${this.WEB_ROOT}/${path}`;
        } else {
            return this.WEB_ROOT;
        }
    }

    http_get_async(url, callback) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function () {
            if (xmlHttp.readyState == 4) {
                if(xmlHttp.responseText.length > 0) {
                    callback({
                        "response": xmlHttp.responseText,
                        "code": xmlHttp.status
                    });
                }
            }
                
        }
        xmlHttp.open("GET", url, true /*Async so true*/);
        xmlHttp.send(null);
    }

    http_post_async(url, json_body, callback) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function () {
            if (xmlHttp.readyState == 4) {
                callback({
                    "response": xmlHttp.responseText,
                    "code": xmlHttp.status
                });
            }
        }
        xmlHttp.open("POST", url, true /*Async so true*/);
        xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        xmlHttp.send("data=" + JSON.stringify(json_body)); // Send the data
    }

    // Request from our api
    api_get_async(api_path, callback) {
        this.http_get_async(this.relative_path(`api/${api_path}`), callback);
    }

    // Post to our api
    api_post_async(api_path, body, callback) {
        this.http_post_async(this.relative_path(`api/${api_path}`), body, callback);
    }


}