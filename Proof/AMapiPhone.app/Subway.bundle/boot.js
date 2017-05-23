window.isNative = !!window.POI;
if(config.debug) isNative = false;
var userAgent = navigator.userAgent;
var os = userAgent.match(/iphone|ipad|ipod/i) ? 'ios' : 'android';
var eventName = os === 'ios' ? 'WebViewJavascriptBridgeReady' : 'DOMContentLoaded';
var OSName = os === 'ios' ? 'ios' : 'android';
if (!isNative) {
    eventName = 'DOMContentLoaded';
}

var subwayapp = {};
var subwayObj = null; //new的地铁对象

document.getElementById('os').className = OSName;
document.addEventListener(eventName, function(act) {

    var kvStoreInit = window.amapKvFactory.getKvStorage('amap-subway-init', {
        os: os,
        bridge: os === 'ios' ? act.bridge : {
            kvInterface: window.kvInterface
        }
    });

    var kvStore = window.amapKvFactory.getKvStorage('amap-subway2', {
        os: os,
        bridge: os === 'ios' ? act.bridge : {
            kvInterface: window.kvInterface
        }
    });

    window.amapKvStorageInit = kvStoreInit;
    window.amapKvStorage = kvStore;
    window.store = kvStore;

    if(config.debug){
        require(['subway', 'app/js/app']);
    } else {
        require(['subway', 'app'], function(){
            require(['app/js/app']);
            require(['sofa']);
        });
    }
    
    if(!config.debug){
        requirejs.onError = function (err) {
            console.log(err);
            // console.log("@clearing kvstore");
            // store.clear();
            //TODO reload
        };
    }

}, false);