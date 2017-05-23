(function(){

	var prefix = config.appServer; //"http://m.amap.com/subway/program/";
	var curver = {};

	function getRemoteVer(cb){
		var url = prefix + "ver.json";
		$.get(url, function(remotever){
			cb(remotever);
		});
	}

	function getLocalVer(cb){
		require(['ver'], function(localver){
			cb(localver);
		});
	}

	function fileinfo(rv, lv, key){

		if(typeof rv === "string") {
			rv = JSON.parse(rv);
		}

		if(typeof lv === "string") {
			lv = JSON.parse(rv);
		}

		if(rv[key] != lv[key]){
			return {
				key : key,
				value : key + "." + rv[key] + ".js",
				ver : rv[key]
			}
		} else {
			return !1;
		}
	}

	function diff(cb){
		getRemoteVer(function(rv){
			getLocalVer(function(lv){

				var ret = [];
				var a = fileinfo(rv, lv, "subway");
				var b = fileinfo(rv, lv, "app");

				curver.subway = lv.subway;
				curver.app = lv.app;

				if(a) ret.push(a);
				if(b) ret.push(b);

				cb(ret);
			});
		});
	}

	function fetch(diffs){

		var total = diffs.length;
		var count = 0;
		var result = [];
		if(total){
			diffs.forEach(function(info){

				var fetchURL = prefix + info.value;
				$.get(fetchURL, function(src){
					count++;
					result.push({
						key : info.key,
						value : src,
						ver : info.ver
					});
					if(count == total){
						save(result);
					}
				});
			});
		} else {

		}
	}

	function save(result){

		result.forEach(function(obj){

			var str = 'define("' + obj.key + '", function(){' + obj.value + '})';
			store.setItem(obj.key, str);
			curver[obj.key] = obj.ver;
		});


		store.setItem("ver", 'define("ver", ' + JSON.stringify(curver) + ')');

	}

	diff(function(diffs){
		fetch(diffs);
	});

	/* 兼容性问题 */
	function patchCSS(val){
        var s = document.createElement("style");
        document.head.appendChild(s);
        s.innerText = val;
    }

})();