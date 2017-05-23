var page = {

    onCreate : function() {
    },
    
    loadView : function() {
        return "error.xml";
    },
    
    onCreated : function() {

        var titleBack = ajx.ui.find("title_back");
        titleBack.click(function(){
            ajx.ui.back(null);
        });
    },
    
    onResume : function() {
    },
    
    onPause : function() {
    },
    
    onDestroy : function() {
    }

};

ajx.ui.registerPage(page);

true;