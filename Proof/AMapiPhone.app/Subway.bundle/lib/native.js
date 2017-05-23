;(function(window,document) {
// window.onerror = function(mess, url, line) {
//     if(/__mapview__/.test(mess)) return;
//     alert(url + "\n" + " 第 " + line + "行" + "\n" + mess);
// };
window.debugInfo = function(title, content) {
    if (typeof content == 'object') {
        content = JSON.stringify(content, null, '  ');
    }
    var html = '<h4>' + title + '</h4>' +
        '<pre onclick="$(this).toggleClass(\'shortMsg\')" class="shortMsg">' + content + '</pre>';
    $('#debugInfo > div').append(html);
};
var agent = navigator.userAgent,
    os = agent.match(/iphone|ipad|ipod/i) ? "ios" : "android",
    browser = {
        agent : agent,
        ios : os === 'ios',
        and : os === 'android',
        and5 : /Android [5-9]\.[0-9]/i.test(agent)
    },
    bridge,
    queueAry = [],
    handlerMap = {},
    connectIOS = function(arg) {
        document.removeEventListener("WebViewJavascriptBridgeReady", connect, false);
        bridge = arg.bridge;
        bridge.init();
        bridge.registerHandler("amapCallWebViewHandler", window.callback);
    },
    connectAndroid = function() {
        document.removeEventListener("DOMContentLoaded", connect, false);
        bridge = {
            send: function(param) {
                param = JSON.stringify(param);
                if (arguments[1]){
                    window.jsInterface && window.jsInterface.invokeMethod("send", [param, arguments[1]]);
                }else{
                    window.jsInterface && window.jsInterface.invokeMethod("send", [param]);
                }
            }
        };
        bridge.send({"action":"registerCallback"}, "callback");
    },
    callback = function(data) {
        var self = POI, autoAction = {setMyLocation:1, setMapPoint:1, setPoiInfo:1, tuanGou:1, openMovieShowings: 1, openHotelCalendar: 1, freshRoomData: 1, getExtraUrl: 1, setFavoriteMark: 1};//客户端主动吐数据
        if("string" === typeof(data)) {
            data = JSON.parse(data);
        }
        var _act = data._action;
        if(autoAction[_act]){
            self[_act] && self[_act](data);
            return;
        }
        data._action = null;
        if("[object Function]" === Object.prototype.toString.call(handlerMap[_act])) {
            handlerMap[_act].call(self,data);
        }
        if(_act && 0 !== _act.indexOf("_HOLD_")) {
            handlerMap[_act] = null;
        }
    },
    connect = function(arg) {
        if("object" === typeof(arg)) {
            browser.ios ? connectIOS(arg) : connectAndroid();
            while(queueAry.length) {
                bridge.send(queueAry.shift());
            }
            connected();
        }
    },
    init = function() {
        document.addEventListener(
            "ios" === os ? "WebViewJavascriptBridgeReady" : "DOMContentLoaded", 
            connect, 
            false
        );
    },
    connected = function() {
        // 给body增加一个“android”或“ios”的class，用于样式的适配
        //$(document.body).addClass(browser.ios ? "ios" : "android");
        var self = POI, body = document.body;
        body.className = (body.className||'') + (browser.ios ? " ios" : " android" + (browser.and5 ? " and5" : ""));
        self.quickInit && self.quickInit();
        self.quickInit = null;
    },
    POI = {
        send : function(param, handler) {
            if(handler) {
                if(!param._action) {
                    var _actionStr = "_ACTION_TO_NATIVEAPI_" + (Math.random().toString().replace("0.", ""));
                    if(!param.hasOwnProperty("function")) {
                        param._action = _actionStr;
                    } else {
                        _actionStr = "_HOLD" + _actionStr;
                        (param["function"])._action = _actionStr;
                    }
                    handlerMap[_actionStr] = handler;
                } else {
                    handlerMap[param._action] = handler;
                }
            }
            if(bridge) {
                bridge.send(param);
            } else {
                queueAry.push(param);
            }
        },
        //quickInit : function(){},//跟客户端连接成功后调用
        //showClientData : function(data){},//客户端主动吐数据时调用
        browser : browser,
        api : {
            extraUrl : '',
            _logParam: {},
            /**
             * 增加日志参数.
             * 调用此方法后，所有调用 userAction 的方法都会加上此参数
             * @param {object} obj 日志参数
             */
            addLogParam: function(obj) {
                $.extend(this._logParam, obj);
            },
            /**
             * 记录日志.
             * @param {String} click 事件名称
             * @param {String} [category] 页面名称，默认为页面初始化时调用的 POI.connect 的参数
             * @param {Object} [otherInfo] 日期的其它数据
             */
            userAction:function(click, category, otherInfo) {
                //发送请求给客户端
                if( typeof category == 'object' ){
                    otherInfo = category;
                    category = '';
                }
                category = category || POI.logPageId;
                if(category && click) {
                    var param = {
                        page: category,
                        click: click
                    };
                    $.extend(param, this._logParam);
                    if (otherInfo) {
                        $.extend(param, otherInfo);
                    }
                    POI.send({
                        action: 'logUserAction',
                        pageid: '1000',
                        buttonid: 1,
                        para: JSON.stringify(param)
                    });
                }
            },
            /**
             * 设置title.
             * @param {String} title 标题内容
             */
            setWebViewTitle: function(title) {
                if (browser.ios) {
                    POI.send({
                        action: 'setWebViewTitle',
                        title: title
                    });
                }
                document.title = title;
            },
            /**
             * 获取当前用户位置：城市，经纬度.
             * @param {Function} handler 回调方法
             */
            getMapLocation : function(handler) {
                var param = {
                    action: "getMapLocation",
                    forceReturnValue: "1"
                };
                POI.send(param, handler);
            },
            /**
             * 登录并绑定相关账号.
             * @param {String} type 绑定账号类型，phone 手机，taobao 淘宝
             * @param {Function} handler 回调函数
             *    回调函数参数为对象类型，包含以下属性(phone和taobao根据type值对应返回)：
             *    userid {String} 用户id，用户在登录时点击返回此值为空
             *    phone {string} 用户手机号，用户绑定手机后的手机号，未绑定时为空
             *    taobao {String} 用户绑定的淘宝账号，未绑定时为空
             */
            loginBind: function(type, handler) {
                POI.send({
                    action: 'loginBind',
                    type: type
                }, handler);
            },
            /**
             * 从native本地存储或获取信息.
             * @param {String} key 存储值的名称
             * @param {String} [value] 存储的值，无此参数时表示获取
             * @param {Function} handler 回调方法
             */
            nativeStorage: function(key, value, handler) {
                if (typeof value == 'function') {
                    handler = value;
                    value = undefined;
                }
                var param = {
                    action: 'nativeStorage',
                    key: key
                };
                if (value != undefined) {
                    param.value = value;
                }
                POI.send(param, handler);
            },
            
            /**
             * aosrequest.
             * 参数为两种形式，分别为 aosrequest(obj, handler) 和
             * aosrequest(url, params, handler, progress, showNetErr, method)
             * 
             * @param {String} url 请求url
             *    此参数为 obj 类型时，此参数为所有参数列表，此时第二个参数为回调方法
             *    此时 obj 的 key 应该和真实接口保持一致：
             *    urlPrefix，method，progress，params，alert，encrypt，goback，showNetErr
             * @param {Array.<Object>} params 请求参数列表
             * @param {Function} handler 回调方法，请求结果会以JSON格式传给方法的第一个参数
             * @param {Integer|String} [progress] 可选，请求时的提示信息，
             *    为数字1时显示默认的提示信息
             * @param {Boolean} [showNetErr=false] 网络异常时是否进行提示，默认不提示
             * @param {String} [method=POST] 可选，请求方式
             */
            aosrequest: function(url, params, handler, progress, showNetErr, method) {
                if (!url) return;
                var obj, self = this;
                // (obj, handler) 形式调用
                if (typeof url === 'object') {
                    obj = url;
                    handler = params;
                    showNetErr = obj.showNetErr;
                    delete obj.showNetErr;
                } else { // (url, params, handler, progress, showNetErr, method) 形式
                    obj = {
                        urlPrefix: url,
                        method: method,
                        progress: progress,
                        params: params
                    };
                }
                obj.action = 'aosrequest';
                obj.urlPrefix = POI.aosPrefixUrl && POI.aosPrefixUrl[obj.urlPrefix] || obj.urlPrefix;
                obj.method = 'string' === typeof obj.method && 'GET' === obj.method.toUpperCase() ? 'GET' : 'POST';
                if (obj.progress) {
                    obj.progress = 1 === obj.progress ? '正在加载' : obj.progress;
                } else {
                    // ios 下 progress 为空字符串时会显示默认信息
                    delete obj.progress;
                }
                POI.send(obj, function(res) {
                    var result = JSON.parse(res.content);
                    if (!result) {
                        result = {code: -10};
                    } else if (showNetErr && (result.code == -1 || result.code == -2)) {
                        self.promptMessage('请检查网络后重试');
                    }
                    handler.call(this, result);
                });
            },
            /**
             * 使用黑框显示提示信息.
             * @param {String} msg 信息内容
             * @param {Integer} [type=0] 显示类型
             *    0 3s后自动消失的框
             *    1 一直显示的提示框
             *    -1 关闭提示框
             */
            promptMessage: function(msg, type) {
                POI.send({action: 'promptMessage', message: msg, type: type || 0});
            },
            /**
             * 打开poi页面.
             * @param {Object} poiInfo poi的基础信息
             * @param {Boolean} [status=false] 状态，默认打开tips形式，值为true时直接打开poi详情
             * @param {String|Integer} status 打开的状态
             *    0 或缺省打开主图显示tip样式
             *    1 直接打开poi详情页
             *    3 打开待tip的主图，但是poi必须为当前poi，用于poi详情页面地址栏点击
             * @param {String} module 打开酒店详情时此值需要为'hotel'
             */
            openPoi: function(poiInfo, status, module) {
                var obj = {
                    action: 'openPoi',
                    poiInfo: poiInfo
                };
                if (status) {
                    obj.status = status + '';
                }
                if (module) {
                    obj.module = module;
                }
                POI.send(obj);
            },
            //openPoiinfo
            openPoiInfo : function(poiid, poiname, address, citycode, newtype, tel, lon, lat, status, module) {
                var poiInfo = {
                    "poiid": poiid || '',
                    "name": poiname || '',
                    "address": address || '',
                    "cityCode": citycode,
                    "poiType": 1,
                    "new_type": newtype,
                    "phoneNumbers": tel || '',
                    "x": '',
                    "y": '',
                    "lon": lon,
                    "lat": lat
                };
                var obj = {
                    action: 'openPoi',
                    poiInfo: poiInfo
                };
                if('1' == status) {
                    obj.status = '1';
                }
                if (module) {
                    obj.module = module;
                }
                POI.send(obj);
            },
            /**
             * 调用客户端功能.
             * @param {String} feature 功能名称
             *    tuangouList 团购适用分店，需要 poiInfo
             *    calendar ios打开日期控件页面
             *    trainInquiries 7.1.0+ 列车查询
             *    subway AMAP7.2.1+ 呼起地铁页面
             * @param {Object} [poiInfo] 当前点的poi信息
             * @param {Object} [params] 参数
             */
            triggerFeature: function(feature, poiInfo, params) {
                var obj = {
                    action: 'triggerFeature',
                    feature: feature
                };
                if (poiInfo) {
                    obj.poiInfo = poiInfo;
                }
                if (params) {
                    obj.params = params;
                }
                POI.send(obj);
            },
            
            shareToFriends: function(poiInfo) {
                POI.send({
                    action: 'shareToFriends',
                    poiInfo: poiInfo || {}
                });
            },
            
            // 注册右侧分享按钮,options参数将覆盖原参数设置
            registShareBtn: function(content) {
                POI.send({
                    action: 'registRightButton',
                    type: 'share',
                    buttonText: '分享',
                    'function': {
                        action: 'share', content: content, urlType: '1', useCustomUrl: '1'
                    }
                });
            },
            /**
             * 调用 schema.
             * @param {String} url schema值
             */
            loadSchema: function(url) {
                if (!url) {
                    return;
                }
                if (browser.ios) {
                    var doc = document,
                        schemaIframe = doc.getElementById('loadSchemaIframe');
                    // 不存在时创建iframe
                    if (!schemaIframe) {
                        schemaIframe = doc.createElement('iframe');
                        schemaIframe.id = 'loadSchemaIframe';
                        schemaIframe.style.cssText = 'display:none;width:0px;height:0px';
                        doc.body.appendChild(schemaIframe);
                    }
                    schemaIframe.src = url;
                } else {
                    POI.send({
                        action: 'loadSchema',
                        url: url
                    });
                }
            },
            /**
             * 显示打电话面板.
             * @param {Array.<Object|String>} list 电话数组
             *    Object 格式： {title: '面板显示内容', content: '实际拨打内容'}
             */
            showPanellist: function(list, poiInfo) {
                if (!list || !list.length) {
                    return;
                }
                for (var i = list.length - 1; i >= 0; i--) {
                    var item = list[i];
                    if (typeof item != 'object') {
                        if (typeof item === 'number') {
                            item += '';
                        }
                        list[i] = {title: item, content: item};
                    }
                }
                var param = {
                    action: 'showPanellist',
                    list: list
                };
                if(poiInfo) {
                    param.poiInfo = poiInfo;
                }
                POI.send(param);
            },
            /**
             * 打开第三方页面.
             * @param {String} iosh ios应用url，用于呼起应用
             * @param {String} andh android应用url，用于呼起应用
             * @param {String} wapUrl 已第三方网站形式打开页面的url
             * @param {Object} showButton 可选，打开第三方页面时右上角显示按钮
             *    buttonText: '更多报价', 按钮显示文字
             *    localFile:'xxx.html', 点击此按钮打开的本地页面名称
             *    otherUrl: 'www.xxx.xxx' 点击此按钮打开的其它页面url
             *    localFile 和 otherUrl 只能一个有值另一个为空字符串
             * @param {String} showloadding 可选，是否显示loading界面，为1时显示
             */
            getAppPara: function(iosh, andh, wapUrl, showButton,showloadding) {
                if(this.extraUrl&&wapUrl){//安全防作弊行为添加div dic cfa 等参数
                    if(wapUrl.indexOf('amap.com')!=-1){
                        wapUrl+=this.extraUrl;
                    }
                }
                var param = {
                    action      : 'openAppUrl',
                    'package'   : '',
                    version     : '',
                    iosh        : iosh || '',
                    andh        : andh || '',
                    wapUrl      : wapUrl || '',
                    showloadding: showloadding || 0
                };
                if (typeof showButton == 'object') {
                    param.showButton = showButton;
                }
                POI.send(param);
            },
            openThirdUrl: function(url, appName, loadingTime, button) {
                var param = {
                    action      : 'openAppUrl',
                    'package'   : '',
                    version     : '',
                    iosh        : '',
                    andh        : '',
                    wapUrl      : url
                };
                if (appName) {
                    param.appName = appName;
                }
                if (loadingTime || loadingTime === 0) {
                    param.loadingTime = loadingTime;
                }
                if (typeof button === 'object') {
                    param.showButton = button;
                }
                POI.send(param);
            },
            /**
             * 打开日期控件页面.
             * @param {Object} params 打开的参数
             *    type 控件类型， hotel scenic
             *    title 页面标题
             *    selected 可选，选中的日期，格式yyyy-MM-dd
             *    today 可选，今天的时间戳，为空时取客户端时间
             *    visitList 景点门票时必存，门票列表 [{date: 'yyyy-MM-dd', price: '$x'}]
             */
            openCalendar: function(params) {
                if (params) {
                    params.timestamp = (new Date()).getTime();
                    POI.util.storage('calendar', JSON.stringify(params));
                }
                if (POI.browser.ios) {
                    this.triggerFeature('calendar');
                } else {
                    location.href = 'exHotelCalendar.html?showTitleBar=1';
                }
            },
            /**
             * 执行路线规划.
             * @param {Object} 起始poi点
             * @param {Object} 结束poi点
             */
            searchRoute: function(start, end) {
                var param = {
                    action: "searchRoute"
                };
                start && (param.startPoi = start);
                end && (param.endPoi = end);
                POI.send(param);
            },

            openBusLine : function(lineid, cityCode) {
                POI.send({
                    action:'openBusLine',
                    data:{
                        busLineid:lineid,
                        cityCode:cityCode
                    }
                });
            },
            
            /**
             * 收藏/取消收藏点.
             * @param {Object} poiInfo 要处理的点的信息
             * @param {Function} handler 回调
             */
            toggleFavoritePoint: function(poiInfo, handler) {
                POI.send({
                    action: 'toggleFavoritePoint',
                    poiInfo: poiInfo
                }, handler);
            },
            
            /**
             * webview后退接口
             * @param {Integer} 后退的步数，正整数，默认为1
             */
            webviewGoBack: function(step) {
                POI.send({
                    action: 'webviewGoBack',
                    step: Math.abs(step | 0) || 1
                });
            },
            
            /**
             * 商户平台使用接口，通知客户端采用特殊收藏方式
             */
            commercialSubscribe : function(flag) {
                POI.send({
                    action: "commercialSubscribe",
                    flag: !!flag
                });
            },
            
            /**
             * 优惠券保存接口
             */
            discountSubscribe : function(disId, state, handler, param) {
                POI.send({
                    action: "discountSubscribe",
                    state: state,
                    data: param || "",
                    id : disId
                }, handler);
            },
            
            /**
             * 生活服务
             */
            lifeServiceCallBack : function(subAction, handler) {
                POI.send({
                    action: "lifeServiceCallBack",
                    subAciton: "" + subAction
                }, handler);
            },
            
            /**
             * 图片预览
             */
            imagePreview : function(module, index, list) {
                var param = {
                    action: "imagePreview",
                    module: module || "",
                    index: index | 0,
                    list: list || []
                };
                POI.send(param);
            }
            
            
        }
    };//end POI
window.callback = callback,window.POI = POI;
init();
})(window,document);