(function(global) {

	'use strict';

	var utils = {
		extend: function(dst) {

			if (!dst) {
				dst = {};
			}

			Array.prototype.slice.call(arguments, 1).forEach(function(source) {

				if (!source) {
					return;
				}

				for (var prop in source) {
					if (source.hasOwnProperty(prop)) {
						dst[prop] = source[prop];
					}
				}
			});

			return dst;
		},
		inherit: function(child, parent) {

			for (var key in parent) {
				if (parent.hasOwnProperty(key)) {
					child[key] = parent[key];
				}
			}

			function Ctor() {

				this.constructor = child;
			}
			Ctor.prototype = parent.prototype;

			child.prototype = new Ctor();
			child.__super__ = parent.prototype;

			return child;
		},
		parseJson: function(value) {

			if (value === null || value === '' || value === undefined) {
				return null;
			}

			try {
				return JSON.parse(value);
			} catch (e) {

				console.error('Json parseError:', e, value);

			}

			return null;
		}
	};

	function KvBaseStorage(namespace, opts) {

		this.__ns = namespace;
	}

	utils.extend(KvBaseStorage.prototype, {
		/**
		 * Just forEach
		 * @param  {Function} callback  Function to execute for each key/value
		 * @param  {*}   thisArg To use as this when executing callback.
		 */
		forEach: function(callback, thisArg) {

			var data = this.getAll();

			for (var key in data) {

				if (data.hasOwnProperty(key)) {

					if (false === callback.call(thisArg, key, data[key])) {
						break;
					}

				}
			}
		},
		getJsonItem: function(key) {
			return utils.parseJson(this.getItem(key));
		},
		getEngineType: function() {
			return this.__kvEngineType;
		}
	});

	/**
	 * KvStorage based on localStorage
	 */
	function KvLocalStorage() {
		KvLocalStorage.__super__.constructor.apply(this, arguments);

		this.__kvEngineType = 'KvLocalStorage';

		this.__kvEngine = global.localStorage;
	}

	utils.inherit(KvLocalStorage, KvBaseStorage);

	utils.extend(KvLocalStorage.prototype, {

		__packKey: function(key) {
			return this.__ns + ':' + key;
		},
		__unpackKey: function(key) {
			return key.substr(this.__ns.length + 1);
		},
		__isLegalKey: function(key) {
			return key.indexOf(this.__ns + ':') === 0;
		},
		clear: function() {
			var keys = this.getAllKeys();

			for (var i = 0, len = keys.length; i < len; i += 1) {
				this.removeItem(keys[i]);
			}

			return keys.length;
		},
		length: function() {
			var keys = this.getAllKeys();
			return keys.length;
		},
		setItem: function(key, val) {
			return this.__kvEngine.setItem(this.__packKey(key), val);
		},
		getItem: function(key) {
			return this.__kvEngine.getItem(this.__packKey(key));
		},
		removeItem: function(key) {
			return this.__kvEngine.removeItem(this.__packKey(key));
		},
		getAllKeys: function() {

			var keys = [];

			for (var i = 0, len = this.__kvEngine.length; i < len; i += 1) {

				var key = this.__kvEngine.key(i);

				if (this.__isLegalKey(key)) {
					keys.push(this.__unpackKey(key));
				}
			}

			return keys;
		},
		getAll: function() {

			var keys = this.getAllKeys();

			var map = {};

			for (var i = 0, len = keys.length; i < len; i += 1) {
				map[keys[i]] = this.getItem(keys[i]);
			}

			return map;
		},
		key: function(idx) {

			var keys = this.getAllKeys();
			return keys[idx];
		}
	});


	//The interface methods for KVStore
	var kvMethods = ['clear', 'length', 'setItem', 'getItem', 'removeItem', 'key', 'getAll', 'getAllKeys'];

	/**
	 * KvStorage based on native iOS KV
	 */
	function KvIosStorage(namespace, opts) {

		if (!opts.bridge || !opts.bridge.callSyncMethod) {

			//alert('KvLocalStorage used: callSyncMethod not found');

			// console.error('KvLocalStorage used: callSyncMethod not found');

			return new KvLocalStorage(namespace, opts);
		}

		this.__kvEngineType = 'KvIosStorage';

		KvIosStorage.__super__.constructor.apply(this, arguments);

		//the iOS Js bridge
		this.bridge = opts.bridge;

	}

	utils.inherit(KvIosStorage, KvBaseStorage);

	kvMethods.forEach(function(fn) {

		KvIosStorage.prototype[fn] = function() {

			var args = Array.prototype.slice.call(arguments);

			//namespace is always the first param
			args.unshift(this.__ns);

			var resp = this.bridge.callSyncMethod('storage.' + fn, args);

			if (!resp || resp.error) {

				//well, well, something wrong
				console.error('Bridge response: ', resp);

				return false;
			}

			if (!resp.result) {

				switch (fn) {

					case 'getAll':
						resp.result = {};
						break;

				}

			}

			return resp.result;
		};
	});

	/**
	 * KvStorage based on native Android KV
	 */
	function KvAndroidStorage(namespace, opts) {

		if (!opts.bridge || !opts.bridge.kvInterface) {

			//alert('KvLocalStorage used: callSyncMethod not found');

			// console.error('KvLocalStorage used: kvInterface not found');

			return new KvLocalStorage(namespace, opts);
		}

		this.__kvEngineType = 'KvAndroidStorage';

		KvAndroidStorage.__super__.constructor.apply(this, arguments);

		this.__kvInterface = opts.bridge.kvInterface;

		//alert('length' + JSON.stringify(window.kvInterface.length('lalal')));


	}

	utils.inherit(KvAndroidStorage, KvBaseStorage);

	kvMethods.forEach(function(fn) {

		KvAndroidStorage.prototype[fn] = function() {

			var args = Array.prototype.slice.call(arguments);

			//namespace is always the first param
			args.unshift(this.__ns);

			var result = this.__kvInterface[fn].apply(this.__kvInterface, args);

			switch (fn) {

				case 'getAll':
				case 'getAllKeys':

					result = JSON.parse(result);

					break;
			}



			return result;
		};
	});

	/**
	 * Just a wrapper to make the kvEngine more effective by reducing the number of calls
	 * @param {KvStorage} kvStorage
	 */
	function KvLazy(kvStorage) {

		KvLazy.__super__.constructor.apply(this, arguments);

		//the real KvStorage
		this.__kvStorage = kvStorage;

		this.__kvEngineType = 'KvLazy:' + kvStorage.getEngineType();

		//the internal kv data
		this.__data = null;
	}

	utils.inherit(KvLazy, KvBaseStorage);

	utils.extend(KvLazy.prototype, {
		__getData: function() {

			if (!this.__data) {

				this.__data = this.__kvStorage.getAll();

				//alert(JSON.stringify(this.__data));

				if (typeof(this.__data) !== 'object') {
					console.error('getAll return not object', this.__data);
				}

			}

			return this.__data;
		},
		getAll: function() {

			return this.__getData();
		},
		getItem: function(key) {

			var data = this.__getData();

			return key in data ? data[key] : null;
		},
		length: function() {

			return this.getAllKeys().length;
		},
		key: function(idx) {

			var keys = this.getAllKeys();

			return keys[idx];
		},
		getAllKeys: function() {
			var keys = [],
				data = this.__getData();

			for (var key in data) {
				if (data.hasOwnProperty(key)) {
					keys.push(key);
				}
			}

			return keys;
		}
	});

	['setItem', 'removeItem', 'clear'].forEach(function(fn) {

		KvLazy.prototype[fn] = function(key, val) {

			//send the modify request
			var result = this.__kvStorage[fn].apply(this.__kvStorage, arguments);

			switch (fn) {

				case 'setItem':
					if (this.__data) {
						this.__data[key] = val;
					}
					break;

				case 'removeItem':
					if (this.__data) {
						delete this.__data[key];
					}
					break;

				case 'clear':
					this.__data = {};
					break;

				default:
					this.__data = null;
			}

			return result;
		};
	});

	var kvClsMap = {
		ios: KvIosStorage,
		android: KvAndroidStorage //KvAndroidStorage
	};

	global.amapKvFactory = {

		getKvStorage: function(ns, opts) {

			var KvCls = kvClsMap[opts.os] || KvLocalStorage;

			if (!opts.noCache) {
				return new KvLazy(new KvCls(ns, opts));
			}

			return new KvCls(ns, opts);
		}
	};


	// var kvStorage = window.amapKvFactory.getKvStorage();

})(window);