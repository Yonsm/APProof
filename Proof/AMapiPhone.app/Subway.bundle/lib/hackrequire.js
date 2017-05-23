(function(){

    var original_loader = requirejs.load;

    var _exec = function(key, val){
        try {
            eval(val);
        } catch(e){
            throw e;
        }
    }

    //hack require.js
    requirejs.load = function (context, moduleName, url) {
        try {
            var res = store.getItem( moduleName );
            if(res){
                console.log("load storage", moduleName);
                _exec(moduleName, res);
                context.completeLoad(moduleName);
            } else {
                console.log("load file", moduleName);
                original_loader(context, moduleName, url);
            }
        } catch(e){
            context.onError(e);
        }
    };

})();
