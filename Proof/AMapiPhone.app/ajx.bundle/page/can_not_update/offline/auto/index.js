// 错误码
const ERRORCODE_SEND_PAGENOTAVAILABLE = 200; //当前页面不允许发送数据
const ERRORCODE_SEND_INITIATIONNOTFINISHED = 201; //初始化尚未完成
const ERRORCODE_SEND_NAVIGATING = 202; //导航中
const ERRORCODE_SEND_SWITCHINGSTORAGE = 203; //切换数据目录
const ERRORCODE_SEND_UDISKUPDATING = 204; //U盘更新中
const ERRORCODE_SEND_DOWNLOADINGAPK = 205; //正在下载apk
const ERRORCODE_SEND_OUTOFSPACE = 206; //空间不足
const ERRORCODE_SEND_DOWNLOADINGMAP = 207; //正在下载地图数据

function getDescriptionOfErrorCode(errorCode) {
    switch (Number(errorCode)) {
        case ERRORCODE_SEND_PAGENOTAVAILABLE:
        case ERRORCODE_SEND_SWITCHINGSTORAGE:
        case ERRORCODE_SEND_UDISKUPDATING:
            return "车机暂时无法接收，\n请将车机返回到地图主页后发送。";
        case ERRORCODE_SEND_INITIATIONNOTFINISHED:
            return "车机正在加载信息，请稍后重试。";
        case ERRORCODE_SEND_NAVIGATING:
            return "车机正在导航中，请结束导航后重试。";
        case ERRORCODE_SEND_DOWNLOADINGAPK:
            return "车机正在下载安装包，请结束后重试。";
        case ERRORCODE_SEND_OUTOFSPACE:
            return "车机空间不足，请清理空间后重试。";
        case ERRORCODE_SEND_DOWNLOADINGMAP:
            return "车机正在下载地图，请结束后重试。";
        default:
            return "车机地图信息获取失败。";
    }
}

//发送状态code
const SENDSTATE_CODE_SENDING = 1; //发送中
const SENDSTATE_CODE_SUCCESS_FULL = 2; //全部发送成功
const SENDSTATE_CODE_SUCCESS_PART = 3; //部分发送成功
const SENDSTATE_CODE_FAILED = 4; //发送失败

var provinceArray = [];
var cityMap = [];
var allsendCity = [];

//1:可以发送  2、继续发送 3、已发送 4、缺少导航包，不能发送
var AUTOSTATUS_CANSEND = 1;
var AUTOSTATUS_CONTINUESEND = 2;
var AUTOSTATUS_SENT = 3;
var AUTOSTATUS_ERRSEND = 4;

var hasUpdate = false;
var maxScroll;

var sendPageCtrl;
var isCarConnected = false;
var isFetchingCityList = false;

const ANDROID_OS = "android";
const IOS_OS = "iOS";
const CODE_SUCCESS = 1;
const CODE_FAILED = 0;
const CODE_CAR_NITIATIONNOTFINISHED = 201;


// 埋点
const SendSuccessedFullPageID = "P00252"
const SendSuccessedFullButtonID = "B001"

const SendSuccessedPartPageID = "P00254"
const SendSuccessedPartButtonID = "B002"

const SendFailedPageID = "P00253"
const SendFailedButtonID = "B001"

const DisconnectedPageID = "P00255"
const DisconnectedButtonID = "B001"

// 状态栏样式（仅iOS）
const StatusBarStyleDefault  = 0;     // Dark content, for use on light backgrounds
const StatusBarStyleLightContent = 1; // Light content, for use on dark backgrounds

var ERRORCODE_ALINK_CONNECTED = 300; //车机已连接
var ERRORCODE_ALINK_DISCONNECTED = 301; //车机连接断开

// 将数组元素用某分隔符分割
function componentsJoinedByString(array, separator) {
    if (array == undefined){
        return "";
    }

    var resultString = "";
    for (var i = 0; i < array.length; i++) {
        if (i == 0) {
            resultString += array[i];
        }
        else {
            resultString += separator + array[i];
        }
    }
    return resultString;
}

function cellInfo(cityInfo, isExpand, isProvince, info) {
    this.citycode = cityInfo.adcode;
    this.isExpand = isExpand; //组cell是否为展开状态
    this.myInfo = info; //城市模板数据
    this.autoStatus = cityInfo.autoStatus; //1:可以发送  2、继续发送 3、已发送 4、缺少导航包，不能发送 5、可以发送 （继续发送+手机版本大于车机版本）【有可能更改5】
    this.cityname = cityInfo.cityname; //城市名称
    this.citysize = cityInfo.citysize; //城市数据大小
    this.isCurrentCity = cityInfo.isCurrentCity; //是否为当前城市
    this.isUpdate = cityInfo.isUpdate; //城市数据是否有更新
    this.pinyin = cityInfo.pinyin; //城市拼音
    this.isProvince = isProvince; //是否为省份城市
    this.cityInfo = cityInfo; //城市数据
};

var CELLTYPE_CITY = 1;
var CELLTYPE_PROVINCE = 2;

var CITY_CELL = '<cell><layout style="cell_city_item_style">' +
    '<panel style="cell_city_content_style">' +
    '<layout height="fill" width="wrap" orientation="vertical" panel_align="left_center" align="left_center">' +
    '<layout height="wrap" width="wrap" orientation="horizontal" align="left_bottom">' +
    '<label id="city_name" style="cell_city_name_style"/>' +
    '<label id="current_city" style="cell_city_current_city_style"/>' +
    '<label id="city_status" style="cell_city_update_status_style" text="有更新"/>' +
    '</layout>' +
    '<label id="city_data_size" style="cell_city_data_size_style" />' +
    '</layout>' +
    '<label id="send_button" style="cell_city_send_button_style" clickable="true"/>' +
    '<label id="data_status" style="cell_city_data_status_style"/>' +
    '</panel>' +
    '<label style="list_divider"/>' +
    '</layout></cell>';

var PROVINCE_CELL = '<cell><layout style="cell_province_item_style">' +
    '<panel style="cell_province_content_style">' +
    '<label id="province_name" style="cell_province_province_name_style"/>' +
    '<label id="province_status" text="有更新" style="cell_province_province_update_status_style"/>' +
    '<image id="group_indicator" image="./image/collapse.png" style="cell_province_province_group_indicator_style"/>' +
    '</panel>' +
    '<label style="list_divider"/>' +
    '</layout></cell>';

var listAdapter = {
    getSectionCount: function () {
        return cityMap.length;
    },

    getSectionXml: function (sectionPosition) {
        return PROVINCE_CELL;
    },

    getSectionData: function (sectionPosition) {
        return provinceArray[sectionPosition].myInfo;
    },

    getCellCount: function (sectionPosition) {
        var data = provinceArray[sectionPosition];
        return data.isExpand ? cityMap[sectionPosition].length : 0;
    },

    getCellType: function (sectionPosition, cellPosition) {
        return 1;
    },

    getCellXml: function (cellType) {
        return CITY_CELL;
    },

    getCellData: function (sectionPosition, cellPosition) {
        return cityMap[sectionPosition][cellPosition].myInfo;
    }
};

function initListPage() {
    var list = ajx.ui.find('city_list');
    list.setAdapter(listAdapter);
    list.update();
    list.sectionClick(function (section_header_view, sectionPosition) {
        provinceArray[sectionPosition].isExpand = !provinceArray[sectionPosition].isExpand;
        provinceArray[sectionPosition].myInfo = getProvinceCellInfo(provinceArray[sectionPosition]);
        list.update();
    });
    list.cellClick(function (cell, sectionPosition, cellPosition) {
        var cellInfo = cityMap[sectionPosition][cellPosition];
        showActionSheet(cellInfo);
    });
    list.cellContentClick(function (cellView, contentView, section, row) {
        if ("send_button" == contentView.get("id")) {
            var cityData = cityMap[section][row];
            var param= { "cityName" : cityData.cityname };
            amap.logService.add("P00251", "B002", JSON.stringify(param));
            sendCity(cityData);
        }
    });

    ajx.ui.find('loadMore').click(function () {
        gotoDownloadCity();
    });

    ajx.ui.find('overly').click(function () {
        setOverlyVisibility(true);
    });

    ajx.ui.find("close").click(function () {
        ajx.ui.find('updateInfoPanel').set("hidden", "true");
    });
}

function fetchData() {
    if (ajx.ui.find('sendPage').get("hidden") == "false") {
        return;
    }
    provinceArray.splice(0, provinceArray.length);
    cityMap.splice(0, cityMap.length);
    fetchCarStorageStatus();
    fetchCityList();
}

function registerAutoLinkCallback(jsonString) {
    //printString("registerAutoLinkCallback changed " + JSON.stringify(jsonString));
    var json = JSON.parse(jsonString);
    if (ERRORCODE_ALINK_DISCONNECTED == json.code) {
        ajx.ui.find("connect_state").set("image", "./image/unlink.png");
        ajx.app.dismissProgress();
        sendPageCtrl.showDisconnectedPage();
        //埋点
        amap.logService.add(DisconnectedPageID, DisconnectedButtonID,"");
    } else if (ERRORCODE_ALINK_CONNECTED == json.code) {
        ajx.ui.find("connect_state").set("image", "./image/link.png");
    }
}

function registerAutoLinkListener() {
    amap.autoCarTransmissionService.registerAutoLinkListener(registerAutoLinkCallback);
}

function unRegisterAutoLinkListener() {
    amap.autoCarTransmissionService.unRegisterAutoListener();
}

/**
 * 1. 车机未连接，取上次连接时获取的状态刷新页面
 * 2. 车机数据获取成功后，缓存在本地
 */
function fetchCarStorageStatus() {
    var autoConnected = amap.autoCarTransmissionService.autoConnectStatus();
    //printString("autoConnectStatus " + autoConnected);
    if (autoConnected) {
        ajx.ui.find("connect_state").set("image", "./image/link.png");
    } else {
        ajx.ui.find("connect_state").set("image", "./image/unlink.png");
        var cache = ajx.localStorage.getItem("aui", "auto_car_state");
        if (cache != undefined) {
            carStatus = JSON.parse(cache);
            refreshCarStorageView(carStatus);
        }
    }

    amap.autoCarTransmissionService.getAutoCarState(function (json) {
        //printString("fetchCarStatus" + json);
        var carStatus = JSON.parse(json);
        if (carStatus.code == CODE_SUCCESS) {
            refreshCarStorageView(carStatus);
            ajx.localStorage.setItem("aui", "auto_car_state", json);
        }
    });
}

function refreshCarStorageView(carStatus) {
    if (isStorageSizeEffective(carStatus)) {
        ajx.ui.find('availble_size_text').set("text", getFileSize(carStatus.availableSpace));
        ajx.ui.find('total_size_text').set("text", getFileSize(carStatus.totalSpace));
    } else {
        ajx.ui.find('availble_size_text').set("text", "--");
        ajx.ui.find('total_size_text').set("text", "--");
    }
}

function isStorageSizeEffective(carStatus) {
    return !(carStatus.availableSpace > carStatus.totalSpace || carStatus.totalSpace == 0 || carStatus.totalSpace == 0 || carStatus.totalSpace == null || carStatus.totalSpace == null);
}

function fetchCityList() {
    if (isFetchingCityList)
        return;
    ajx.app.showProgress("加载中...", function () {
    });
    isFetchingCityList = true;
    amap.autoCarTransmissionService.requestCityListInfo(function (json) {
        // print("data--" + json);
        var jsonData = JSON.parse(json);
        if (!jsonData) {
            ajx.app.dismissProgress();
            ajx.app.alert(getDescriptionOfErrorCode(-1), "", "重试", function () {
                fetchCityList();
            }, "取消", function () {
                ajx.ui.back();
            });
            return;
        }
        hasUpdate = false;
        isCarConnected = (jsonData.code == CODE_SUCCESS);
        var provinceList = jsonData.data;
        var provinceInfo;
        allsendCity.splice(0, allsendCity.length);
        if (jsonData.code == ERRORCODE_ALINK_DISCONNECTED || jsonData.code == CODE_SUCCESS) {
            for (var i = 0; i < provinceList.length; i++) {
                provinceInfo = provinceList[i];
                provinceArray[i] = new cellInfo(provinceInfo, false, true, getProvinceCellInfo(provinceInfo));
                var citysJson = provinceInfo.city;
                var cityInfo;
                var citys = [];
                for (var j = 0; j < citysJson.length; j++) {
                    cityInfo = citysJson[j];
                    if (cityInfo.isUpdate == 1 && hasUpdate == false) {
                        hasUpdate = true;
                    }

                    if (cityInfo.autoStatus == AUTOSTATUS_CANSEND) {
                        allsendCity.push(cityInfo);
                    } else if (cityInfo.autoStatus == AUTOSTATUS_CONTINUESEND) {
                        allsendCity.unshift(cityInfo); //继续发送的城市添加到列表前面
                    }
                    citys[j] = new cellInfo(cityInfo, false, false, getCityCellInfo(cityInfo));
                }
                cityMap[i] = citys;
            }
            if (hasUpdate == true) {
                ajx.ui.find('updateInfoPanel').set("hidden", "false");
            } else {
                ajx.ui.find('updateInfoPanel').set("hidden", "true");
            }
            ;
            refreshSendAll(isCarConnected, allsendCity.length > 0);
            setListFooter();
            hideView();
            ajx.ui.find("city_list").update();
        } else {
            ajx.app.alert(getDescriptionOfErrorCode(jsonData.code), "", "重试", function () {
                fetchCityList();
            }, "取消", function () {
                ajx.ui.back();
            });
        }
        ajx.app.dismissProgress();

        isFetchingCityList = false;
    });
};

function setListFooter() {
    var list = ajx.ui.find('city_list');
    if (list.getFooter() == undefined) {
        list.setFooter('<layout width="fill" height="wrap" orientation="vertical" align="center"><label id="loadMoreFooter" style="load_more" font="26" margin="40,0,40,0"/></layout>');
        var loadMoreFooter = list.getFooter().find('loadMoreFooter');
        loadMoreFooter.click(function () {
            gotoDownloadCity();
        });
    }
}

//打印超长字符窜
function printString(str) {
    var length = str.length;
    var bullet = Math.floor(length / 900);
    for (var i = 0; i < bullet; i++) {
        print(str.substr(i * 900, 900));
    }
    print(str.substr((bullet * 900), (length - (bullet * 900))));
}

function showActionSheet(cellInfo) {
    //printString("showActionSheet:" + JSON.stringify(cellInfo));
    ajx.ui.find('overly_title').set("text", cellInfo.cityname);
    ajx.ui.find('overly_sub_title').set("hidden", cellInfo.autoStatus != AUTOSTATUS_ERRSEND ? "true" : "false");
    ajx.ui.find('overly_item_cancel').click(function () {
        setOverlyVisibility("true");
    });
    var overly_item_0 = ajx.ui.find('overly_item_0');
    var overly_item_1 = ajx.ui.find('overly_item_1');
    var overly_item_2 = ajx.ui.find('overly_item_2');
    overly_item_2.set("hidden", "true");
    if (isCarConnected) {
        if (cellInfo.autoStatus == AUTOSTATUS_CONTINUESEND) {
            overly_item_0.set("hidden", "false");
            overly_item_0.set("text", "继续发送");
            overly_item_0.click(function () {
                var param= { "cityName" : cellInfo.cityname };
                amap.logService.add("P00251", "B002", JSON.stringify(param));
                sendCity(cellInfo);
                setOverlyVisibility("true");
            });
            overly_item_1.set("hidden", "false");
            overly_item_1.set("text", "取消发送");
            overly_item_1.click(function () {
                ajx.app.showProgress("加载中...", function () {
                });
                var pinyinArray = [];
                pinyinArray.push(cellInfo.pinyin);
                amap.autoCarTransmissionService.stopSendCities(JSON.stringify(pinyinArray), function (jsonString) {
                    var jsonMap = JSON.parse(jsonString);
                    if (jsonMap.code == CODE_SUCCESS) {
                        fetchData();
                    } else {
                        ajx.app.dismissProgress();
                    }
                });
                setOverlyVisibility("true");
            });

            if (cellInfo.isUpdate == 1) {
                overly_item_2.set("hidden", "false");
                overly_item_2.set("text", "去更新");
                overly_item_2.click(function () {
                    gotoDownloadCity();
                    setOverlyVisibility("true");
                });
            }

            setOverlyVisibility("false");
            return;
        }
        if (cellInfo.autoStatus == AUTOSTATUS_SENT) {
            if (cellInfo.isUpdate == 1) {
                overly_item_0.set("hidden", "false");
                overly_item_0.set("text", "去更新");
                overly_item_0.click(function () {
                    gotoDownloadCity();
                    setOverlyVisibility("true");
                });
                overly_item_1.set("hidden", "true");
                setOverlyVisibility("false");
            }
            return;
        }
        if (cellInfo.autoStatus == AUTOSTATUS_ERRSEND) {
            overly_item_0.set("hidden", "false");
            overly_item_0.set("text", "去下载完整数据");
            overly_item_0.click(function () {
                gotoDownloadCity();
                setOverlyVisibility("true");
            });
            overly_item_1.set("hidden", "true");
            if (cellInfo.isUpdate == 1) {
                overly_item_1.set("hidden", "false");
                overly_item_1.set("text", "去更新");
                overly_item_1.click(function () {
                    gotoDownloadCity();
                    setOverlyVisibility("true");
                });
            }
            setOverlyVisibility("false");
            return;
        }

        if (cellInfo.isUpdate == 1) {
            overly_item_0.set("hidden", "false");
            overly_item_0.set("text", "发送到汽车");
            overly_item_0.click(function () {
                var param= { "cityName" : cellInfo.cityname };
                amap.logService.add("P00251", "B002", JSON.stringify(param));
                sendCity(cellInfo);
                setOverlyVisibility("true");
            });
            overly_item_1.set("hidden", "false");
            overly_item_1.set("text", "去更新");
            overly_item_1.click(function () {
                gotoDownloadCity();
                setOverlyVisibility("true");
            });
            setOverlyVisibility("false");
        } else {
            overly_item_0.set("hidden", "false");
            overly_item_0.set("text", "发送到汽车");
            overly_item_0.click(function () {
                var param= { "cityName" : cellInfo.cityname };
                amap.logService.add("P00251", "B002", JSON.stringify(param));
                sendCity(cellInfo);
                setOverlyVisibility("true");
            });
            overly_item_1.set("hidden", "true");
            setOverlyVisibility("false");
        }
    } else {
        if (cellInfo.autoStatus == AUTOSTATUS_ERRSEND) {
            overly_item_0.set("hidden", "false");
            overly_item_0.set("text", "去下载完整数据");
            overly_item_0.click(function () {
                gotoDownloadCity();
                setOverlyVisibility("true");
            });
            if (cellInfo.isUpdate == 1) {
                overly_item_1.set("hidden", "false");
                overly_item_1.set("text", "去更新");
                overly_item_1.click(function () {
                    gotoDownloadCity();
                    setOverlyVisibility("true");
                });
            } else {
                overly_item_1.set("hidden", "true");
            }
            setOverlyVisibility("false");
            return;
        }
        if (cellInfo.isUpdate == 1) {
            overly_item_0.set("hidden", "false");
            overly_item_0.set("text", "去更新");
            overly_item_0.click(function () {
                gotoDownloadCity();
                setOverlyVisibility("true");
            });
            overly_item_1.set("hidden", "true");
            setOverlyVisibility("false");
            return;
        } else {
            return;
        }
    }
}

function gotoDownloadCity() {
    var name = ajx.os.name;
    if (ANDROID_OS == name) {
        ajx.ui.go("amapuri://openFeature?featureName=downOfflineMap");
    } else if (IOS_OS == name) {
        setStatusBarTypeInIOS(StatusBarStyleDefault);
        ajx.ui.go("iosamap://openFeature?featureName=OfflineMap&sourceApplication=flash");
    }
}

function sendCity(cellInfo) {
    var cityArray = [];
    cityArray.push(cellInfo.cityInfo);
    //printString("sendCity " + cellInfo.cityname + " " + JSON.stringify(cellInfo));
    sendPageCtrl.sendCities(JSON.stringify(cityArray));
}

function refreshSendAll(carConnected, hasData) {
    var sendAllLayout = ajx.ui.find('sendAllLayout');
    if (carConnected) {
        sendAllLayout.set("hidden", "false");
        var sendAll = ajx.ui.find('sendAll');
        if (hasData) {
            ajx.ui.find('sendAll').set('state', 'normal');
            sendAll.click(function () {
                var paramArray = new Array();
                for(var i = 0 ; i < allsendCity.length ; i++){
                    paramArray[i] = allsendCity[i].cityname;
                }
                var param = { "text" : paramArray };
                amap.logService.add("P00251", "B001", JSON.stringify(param));
                sendPageCtrl.sendCities(JSON.stringify(allsendCity));
            });
        } else {
            sendAll.set('state', 'disabled');
        }
    } else {
        sendAllLayout.set("hidden", "true");
    }
}

function isCanSend(autoStatus) {
    return autoStatus == AUTOSTATUS_CANSEND || autoStatus == AUTOSTATUS_CONTINUESEND;
};

//cityStatus 1:可以发送  2、继续发送 3、已发送 4、缺少导航包，不能发送
var cityStatusTextArray = ["发送", "继续发送", "已发送", "缺少导航包，暂不能发送"];
var sendButtonStyleArray = ["cell_city_send_button_style", "cell_city_continue_send_button_style"];

function getCityCellInfo(cityInfo) {
    var isHidden = cityInfo.isCurrentCity != 1;
    var isUpdate = cityInfo.isUpdate != 1;
    var size = getFileSize(cityInfo.citysize);
    var autoStatus = cityInfo.autoStatus;

    var cityStatusText = cityStatusTextArray[autoStatus - 1];
    var sendButtonStyle = sendButtonStyleArray[0];
    if (autoStatus - 1 < sendButtonStyleArray.length) {
        sendButtonStyle = sendButtonStyleArray[autoStatus - 1];
    }

    var cityStatusHidden = false;
    var sendButtonHidden = false;
    if (isCarConnected) {
        if (autoStatus == AUTOSTATUS_CANSEND || autoStatus == AUTOSTATUS_CONTINUESEND) {
            sendButtonHidden = false;
            cityStatusHidden = true;
        } else {
            sendButtonHidden = true;
            cityStatusHidden = false;
        }
    } else {
        sendButtonHidden = true;
        if (autoStatus == AUTOSTATUS_SENT || autoStatus == AUTOSTATUS_ERRSEND) {
            cityStatusHidden = false;
        } else {
            cityStatusHidden = true;
        }
    }
    return '{"city_name":{"text":"' + cityInfo.cityname + '"},"city_status":{"hidden":"' + isUpdate + '"},"current_city":{"hidden":"' + isHidden + '"},"city_data_size":{"text":"' + size + '"}, "send_button":{"style":"' + sendButtonStyle + '","hidden":"' + sendButtonHidden + '"}, "data_status":{"text":"' + cityStatusText + '","hidden":"' + cityStatusHidden + '"}}';
}

function getProvinceCellInfo(provinceInfo) {
    var isUpdate = provinceInfo.isUpdate != 1;
    var groupIndicatorImage = provinceInfo.isExpand ? "./image/collapse.png" : "./image/expand.png";
    return '{"province_name":{"text":"' + provinceInfo.cityname + '"},"province_status":{"hidden":"' + isUpdate + '"},"group_indicator":{"image":"' + groupIndicatorImage + '"}}';
}

function getFileSize(fileByte) {
    var fileSizeByte = fileByte;
    var fileSizeMsg = "";
    // if (fileSizeByte < 1048576) fileSizeMsg = (fileSizeByte / 1024).toFixed(2) + "KB";
    if (fileSizeByte == 1048576) fileSizeMsg = "1MB";
    else if (fileSizeByte < 1073741824) fileSizeMsg = (fileSizeByte / (1024 * 1024)).toFixed(1) + "MB";
    else if (fileSizeByte > 1048576 && fileSizeByte == 1073741824) fileSizeMsg = "1GB";
    else if (fileSizeByte > 1073741824 && fileSizeByte < 1099511627776) fileSizeMsg = (fileSizeByte / (1024 * 1024 * 1024)).toFixed(1) + "GB";
    else fileSizeMsg = "文件超过1TB";
    return fileSizeMsg;
}

function hideView() {
    if (provinceArray.length == 0) {
        ajx.ui.find("emptyView").set('hidden', 'false');
        ajx.ui.find("cityDataPanel").set('hidden', 'true');
        ajx.ui.find("cityDataHeaderPanel").set('hidden', 'true');

    } else {
        ajx.ui.find("emptyView").set('hidden', 'true');
        ajx.ui.find("cityDataPanel").set('hidden', 'false');
        ajx.ui.find("cityDataHeaderPanel").set('hidden', 'false');
    }
};

function initSendPage() {
    sendPageCtrl = Object.create(SendPageController);
    sendPageCtrl.configSendPage();
    ajx.ui.find('sendPage').click(function () {
    }); //屏蔽事件
}

function setOverlyVisibility(isHidden) {
    ajx.ui.find('overly').set("hidden", isHidden);
    ajx.ui.find('overly_content').set("hidden", isHidden);
}

function getOverlyVisibility() {
    return ajx.ui.find('overly').get("hidden");
}

//发送页面start
/* 枚举数据类型定义start*/

// 发送页面state枚举
var SendPageSate = {
    SendingSate: 1,
    SuccessFullState: 2,
    SuccessPartState: 3,
    FailedState: 4,
    DisconnectedState: 5
}

// 发送页面title样式枚举
var SendPageTitleStyle = {
    SendingTitleStyle: "sending_title_style",
    SuccessTitleStyle: "success_title_style",
    FailedTitleStyle: "failed_title_style",
    DisconnectedTitleStyle: "disconnected_title_style",
}

// 发送页面icon样式枚举
var SendPageSateIconStyle = {
    SendingIconStyle: "sending_icon_style",
    SuccessFullIconStyle: "success_full_icon_style",
    SuccessPartIconStyle: "success_part_icon_style",
    FailedIconStyle: "failed_icon_style",
    DisconnectedIconStyle: "disconnected_icon_style"
}

// 发送页面操作按钮样式枚举
var SendPageOperateBtnStyle = {
    OKBtnStyle: "ok_btn_style",
    StopBtnStyle: "stop_btn_style",
}

/* 枚举数据类型定义end*/

// 发送页Data基类（极简主义法）
var SendPageBaseData = {
    createNew: function () {
        var baseData = {};
        baseData.state = 0;
        baseData.titleStyle = "";
        baseData.stateIconStyle = "";
        baseData.operateBtnStyle = "";
        baseData.alreadySentCityNum = 0;
        baseData.totalCityNum = 0;
        return baseData;
    }
}

//发送页发送中状态Data类
var SendPageSendingData = {
    createNew: function () {
        var sendingData = SendPageBaseData.createNew();
        sendingData.state = SendPageSate.SendingSate;
        sendingData.titleStyle = SendPageTitleStyle.SendingTitleStyle;
        sendingData.stateIconStyle = SendPageSateIconStyle.SendingIconStyle;
        sendingData.operateBtnStyle = SendPageOperateBtnStyle.StopBtnStyle;
        sendingData.progress = 0;
        sendingData.tipText = "数据发送中请勿做其他操作\n保持手机靠近汽车，防止连接中断";
        return sendingData;
    }
}

//发送页全部发送成功状态Data类
var SendPageSuccessFullData = {
    createNew: function () {
        var successFullData = SendPageBaseData.createNew();
        successFullData.state = SendPageSate.SuccessFullState;
        successFullData.titleStyle = SendPageTitleStyle.SuccessTitleStyle;
        successFullData.stateIconStyle = SendPageSateIconStyle.SuccessFullIconStyle;
        successFullData.operateBtnStyle = SendPageOperateBtnStyle.OKBtnStyle;
        return successFullData;
    }
}

//发送页部分发送成功状态Data类
var SendPageSuccessPartData = {
    createNew: function () {
        var successPartData = SendPageBaseData.createNew();
        successPartData.state = SendPageSate.SuccessPartState;
        successPartData.titleStyle = SendPageTitleStyle.SuccessTitleStyle;
        successPartData.stateIconStyle = SendPageSateIconStyle.SuccessPartIconStyle;
        successPartData.operateBtnStyle = SendPageOperateBtnStyle.OKBtnStyle;
        successPartData.failedCityList = [];
        return successPartData;
    }
}

//发送页发送失败状态Data类
var SendPageFailedData = {
    createNew: function () {
        var failedData = SendPageBaseData.createNew();
        failedData.state = SendPageSate.FailedState;
        failedData.titleStyle = SendPageTitleStyle.FailedTitleStyle;
        failedData.stateIconStyle = SendPageSateIconStyle.FailedIconStyle;
        failedData.operateBtnStyle = SendPageOperateBtnStyle.OKBtnStyle;
        failedData.tipText = "请重新发送";
        return failedData;
    }
}

//发送页断开连接状态Data类
var SendPageDisconnectedData = {
    createNew: function () {
        var disconnectedData = SendPageBaseData.createNew();
        disconnectedData.state = SendPageSate.DisconnectedState;
        disconnectedData.titleStyle = SendPageTitleStyle.DisconnectedTitleStyle;
        disconnectedData.stateIconStyle = SendPageSateIconStyle.DisconnectedIconStyle;
        disconnectedData.operateBtnStyle = SendPageOperateBtnStyle.OKBtnStyle;
        disconnectedData.tipText = "请检查手机热点状态";
        return disconnectedData;
    }
}

// 定义数据发送页类
var SendPage = {

    // public方法

    getState: function () {
        return this.state;
    },

    update: function (data) {
        this.setData(data);
    },

    registerOperateAction: function (action) {
        var operateBtn = ajx.ui.find("operateBtn");
        operateBtn.click(action);
    },

    // private方法

    setData: function (data) {
        this.state = data.state;
        switch (data.state) {
            case SendPageSate.SendingSate:
            {
                this.hideFailedCityDescLabel("true");
                this.setProgressLabelText(data.progress.toString());
                this.setProgressDescLabelText("已发送" + data.alreadySentCityNum + "/" + data.totalCityNum + "个城市");
                this.setStateDescLabelText(data.tipText);
                break;
            }
            case SendPageSate.SuccessFullState:
            {
                this.hideFailedCityDescLabel("true");
                this.setStateDescLabelText("成功发送" + data.alreadySentCityNum + "/" + data.totalCityNum + "个城市");
                break;
            }
            case SendPageSate.SuccessPartState:
            {
                this.hideFailedCityDescLabel("false");
                this.setStateDescLabelText("成功发送" + data.alreadySentCityNum + "/" + data.totalCityNum + "个城市");

                var maxShowCityNum = 3;
                var failedCityDesc = "";
                var length = data.failedCityList.length;
                for (var i = 0; i < length; i++) {
                    if (length <= maxShowCityNum) {
                        failedCityDesc += data.failedCityList[i]
                        if (i < length - 1) {
                            failedCityDesc += "、";
                        }
                    } else if (length > maxShowCityNum) {
                        failedCityDesc += data.failedCityList[i]
                        if (i < maxShowCityNum - 1) {
                            failedCityDesc += "、";
                        } else if (i == maxShowCityNum - 1) {
                            failedCityDesc += "等" + length + "个城市";
                            break;
                        }
                    }
                }
                failedCityDesc += "发送失败";
                this.setFailedCityDescLabelText(failedCityDesc);
                break;
            }
            case SendPageSate.FailedState:
            {
                this.hideFailedCityDescLabel("true");
                this.setStateDescLabelText(data.tipText);
                break;
            }
            case SendPageSate.DisconnectedState:
            {
                this.hideFailedCityDescLabel("true");
                this.setStateDescLabelText(data.tipText);
                break;
            }
            default:
        }

        this.setTitleStyle(data.titleStyle);
        this.setIconStyle(data.stateIconStyle);
        this.setOperateBtnStyle(data.operateBtnStyle);
    },

    setTitleStyle: function (style) {
        var titleLabel = ajx.ui.find("titleLabel");
        titleLabel.set("style", style);
    },

    setIconStyle: function (style) {
        switch (style) {
            case SendPageSateIconStyle.SendingIconStyle:
            {
                var animateStateIcon = ajx.ui.find("animateStateIcon");
                animateStateIcon.set("style", style);

                this.hideProgressPanel("false");
                this.hideStateIcon("true");

                // 需要额外处理的逻辑，为animateStateIcon增加动画
                if (!this.timer) {
                    var onceTime = 1500; // 旋转一圈的时间
                    var frames = 40; // 一圈时间多少帧
                    var speed = onceTime / frames; // 旋转速度
                    var onceDegree = 360 / frames; // 一次旋转角度
                    var currDegree = 0;
                    this.timer = ajx.ui.setInterval(function () {
                        animateStateIcon.set("rotation", currDegree);
                        if (currDegree + onceDegree >= 360) {
                            currDegree = 0;
                        } else {
                            currDegree += onceDegree;
                        }
                    }, speed);
                }
                break;
            }
            default:
            {
                var stateIcon = ajx.ui.find("stateIcon");
                stateIcon.set("style", style);

                this.hideProgressPanel("true");
                this.hideStateIcon("false");

                // 停止动画
                ajx.ui.clearInterval(this.timer);
                this.timer = null;
            }
        }
    },

    setStateDescLabelText: function (text) {
        var stateDescLabel = ajx.ui.find("stateDescLabel");
        stateDescLabel.set("text", text);
    },

    // SuccessPartState状态有效
    setFailedCityDescLabelText: function (text) {
        var failedCityDescLabel = ajx.ui.find("failedCityDescLabel");
        failedCityDescLabel.set("text", text);
    },

    setOperateBtnStyle: function (style) {
        var operateBtn = ajx.ui.find("operateBtn");
        operateBtn.set("style", style);
    },

    // SuccessPartState状态有效
    hideFailedCityDescLabel: function (hide) {
        var failedCityDescLabel = ajx.ui.find("failedCityDescLabel");
        failedCityDescLabel.set("hidden", hide);
    },

    hideProgressPanel: function (hide) {
        var progressPanel = ajx.ui.find("progressPanel");
        progressPanel.set("hidden", hide);
    },

    hideStateIcon: function (hide) {
        var stateIcon = ajx.ui.find("stateIcon");
        stateIcon.set("hidden", hide);
    },

    // SendingSate状态有效
    setProgressLabelText: function (text) {
        var progressLabel = ajx.ui.find("progressLabel");
        progressLabel.set("text", text);
    },

    // SendingSate状态有效
    setProgressDescLabelText: function (text) {
        var progressDescLabel = ajx.ui.find("progressDescLabel");
        progressDescLabel.set("text", text);
    }
}

// 发送页控制器
var SendPageController = {

    sendPage: Object.create(SendPage),

    configSendPage: function () {
        var thiz = this; // registerOperateAction参数方法中访问this指向的是window，所以暂存一下该对象
        this.sendPage.registerOperateAction(function () {
            print("registerOperateAction " + thiz.sendPage.getState());
            switch (thiz.sendPage.getState()) {
                case SendPageSate.SendingSate:
                {
                    ajx.app.alert("停止数据发送？", "", "取消", function () {
                    }, "停止", function () {
                        print(" sendPage.getState() " + thiz.sendPage.getState());
                        if (thiz.sendPage.getState() == SendPageSate.SendingSate) {
                            thiz.dismissSendPage();
                            ajx.app.showProgress("加载中...", function () {
                            });
                            amap.autoCarTransmissionService.stopSend(function (jsonString) {
                                ajx.app.dismissProgress();
                                fetchData();
                            });

                            // 停止动画
                            ajx.ui.clearInterval(thiz.sendPage.timer);
                            thiz.sendPage.timer = null;
                        }
                    });
                    break;
                }
                case SendPageSate.SuccessFullState:
                case SendPageSate.SuccessPartState:
                case SendPageSate.FailedState:
                {
                    thiz.dismissSendPage();
                    fetchData();
                    break;
                }
                case SendPageSate.DisconnectedState:
                {
                    // 直接退出模块
                    ajx.ui.back();
                    break;
                }
                default:
            }
        });
    },

    sendCities: function (arrayString) {
        this.showSendPage();
        var cityArray = JSON.parse(arrayString);
        var data = SendPageSendingData.createNew();
        data.progress = 0;
        data.alreadySentCityNum = 0;
        data.totalCityNum = cityArray.length;
        this.sendPage.update(data);

        var thiz = this;
        amap.autoCarTransmissionService.startSendAllCities(arrayString, function (jsonString) {
            var json = JSON.parse(jsonString);
            //先判断是否允许发送
            var code = json.code;
            var allowToDownloadState = json.allowToDownloadState;
            if (code != undefined && allowToDownloadState != undefined) {
                if (code == CODE_SUCCESS && allowToDownloadState == CODE_SUCCESS) {
                    return;
                } else if (code == CODE_FAILED) {
                    var data = SendPageFailedData.createNew();
                    thiz.sendPage.update(data);
                    return;
                }

                var msg = getDescriptionOfErrorCode(allowToDownloadState);
                ajx.app.alert("发送失败", msg, "确定", function () {
                    thiz.dismissSendPage();
                });
                // 停止动画
                ajx.ui.clearInterval(thiz.sendPage.timer);
                thiz.sendPage.timer = null;
                return;
            }

            var sendState = json.sendState; //sendState: 1：发送中 2：全部发送完成 3：部分发送完成 4：发送失败
            switch (sendState) {
                case SENDSTATE_CODE_SENDING: //发送中
                {
                    var data = SendPageSendingData.createNew();
                    data.progress = json.progress;
                    data.alreadySentCityNum = json.alreadySentCityNum;
                    data.totalCityNum = json.totalCityNum;
                    thiz.sendPage.update(data);
                    amap.autoCarTransmissionService.screenKeepScreenLit(true);
                    break;
                }
                case SENDSTATE_CODE_SUCCESS_FULL: //全部发送成功
                {
                    var data = SendPageSuccessFullData.createNew();
                    data.alreadySentCityNum = json.alreadySentCityNum;
                    data.totalCityNum = json.totalCityNum;
                    thiz.sendPage.update(data);
                    amap.autoCarTransmissionService.screenKeepScreenLit(false);

                    //埋点
                    var successCitiesString = componentsJoinedByString(JSON.parse(json.successCityList), ",");
                    var param = {"success_cities": successCitiesString};
                    amap.logService.add(SendSuccessedFullPageID, SendSuccessedFullButtonID, JSON.stringify(param));
                    break;
                }
                case SENDSTATE_CODE_SUCCESS_PART: //部分发送成功
                {
                    var data = SendPageSuccessPartData.createNew();
                    data.alreadySentCityNum = json.alreadySentCityNum;
                    data.totalCityNum = json.totalCityNum;
                    data.failedCityList = JSON.parse(json.failedCityList); //失败城市json：["北京市", "上海市"]
                    thiz.sendPage.update(data);
                    amap.autoCarTransmissionService.screenKeepScreenLit(false);

                    //埋点
                    var successCitiesString = componentsJoinedByString(JSON.parse(json.successCityList), ",");
                    var failedCitiesString = componentsJoinedByString(JSON.parse(json.failedCityList), ",");
                    var param = {
                        "success_cities": successCitiesString,
                        "failed_cities": failedCitiesString
                    };
                    amap.logService.add(SendSuccessedPartPageID, SendSuccessedPartButtonID, JSON.stringify(param));
                    break;
                }
                case SENDSTATE_CODE_FAILED: //发送失败
                {
                    var data = SendPageFailedData.createNew();
                    thiz.sendPage.update(data);
                    amap.autoCarTransmissionService.screenKeepScreenLit(false);

                    //埋点
                    var failedCitiesString = componentsJoinedByString(JSON.parse(json.failedCityList), ",");
                    var param = {"failed_cities": failedCitiesString};
                    amap.logService.add(SendFailedPageID, SendFailedButtonID, JSON.stringify(param));
                    break;
                }
            }
        });
    },

    showSendPage: function () {
        ajx.ui.find('sendPage').set("hidden", "false");
    },

    dismissSendPage: function () {
        ajx.ui.find('sendPage').set("hidden", "true");
        amap.autoCarTransmissionService.screenKeepScreenLit(false);
    },

    showDisconnectedPage: function () {
        this.showSendPage();
        var data = SendPageDisconnectedData.createNew();
        this.sendPage.update(data);
        amap.autoCarTransmissionService.screenKeepScreenLit(false);
    },

    haveSendPageShown: function () {
        return ajx.ui.find('sendPage').get("hidden") == "false" ? true : false;
    },

    getCurrentPageState: function () {
        return this.sendPage.getState();
    }
}

//屏蔽物理back键
ajx.ui.keyEvent("back", function () {
    if (getOverlyVisibility() == "false") {
        setOverlyVisibility(true);
        return true;
    }
    return sendPageCtrl.haveSendPageShown();
});

//打开或者关闭屏幕常亮
function keepScreenLitIfNeed(yesOrNo) {
    if (yesOrNo == true) {
        if (sendPageCtrl != undefined && sendPageCtrl.getCurrentPageState() == SENDSTATE_CODE_SENDING) {
            amap.autoCarTransmissionService.screenKeepScreenLit(true);
        }
    }
    else {
        amap.autoCarTransmissionService.screenKeepScreenLit(false);
    }
}

function setStatusBarTypeInIOS(type) {
    if (IOS_OS == ajx.os.name) {
        amap.autoCarTransmissionService.setStatusBarType(type);
    }
}

//发送页面end

var page = {
    onCreate: function () {
    },

    loadView: function () {
        return "index.xml";
    },

    onCreated: function () {
        initListPage();
        initSendPage();
        registerAutoLinkListener();
        setStatusBarTypeInIOS(StatusBarStyleLightContent);
    },

    onResume: function () {
        //重新加载数据时，取消actionSheet
        setOverlyVisibility("true");
        fetchData();
        keepScreenLitIfNeed(true);
        setStatusBarTypeInIOS(StatusBarStyleLightContent);
    },

    onPause: function () {
        keepScreenLitIfNeed(false);
        setStatusBarTypeInIOS(StatusBarStyleDefault);
    },

    onDestroy: function () {
        unRegisterAutoLinkListener();
        keepScreenLitIfNeed(false);
        setStatusBarTypeInIOS(StatusBarStyleDefault);
    },
};

ajx.ui.registerPage(page);

true;
