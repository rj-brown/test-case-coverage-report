Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {
        console.log("PI GRID");
        Ext.create('Rally.data.WsapiDataStore', {
            model: 'PortfolioItem/Feature',
            fetch: ['FormattedID','Name','UserStories','Release','Project'],
            pageSize: 100,
            autoLoad: true,
            listeners: {
                load: this._onDataLoaded,
                scope: this
            }
        });
    },

    _createGrid: function(features) {
         this.add({
            xtype: 'rallygrid',
            store: Ext.create('Rally.data.custom.Store', {
                data: features,
                pageSize: 100
            }),

            columnCfgs: [
                {
                   text: 'Formatted ID', dataIndex: 'FormattedID', xtype: 'templatecolumn',
                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                },
                {
                    text: 'Name', dataIndex: 'Name'
                },
                {
                    text: 'Release', dataIndex: 'Release'
                },
                {
                    text: 'Project', dataIndex: 'Project'
                },
                {
                    text: 'Story Count', dataIndex: 'StoryCount'
                },
                {
                    text: 'User Stories', dataIndex: 'UserStories', 
                    renderer: function(value) {
                        var html = [];
                        Ext.Array.each(value, function(userstory){
                            html.push('<a href="' + Rally.nav.Manager.getDetailUrl(userstory) + '">' + userstory.FormattedID + ' - ' + userstory.Name+ '</a>');
                        });
                        return html.join('<br>');
                    }
                }
            ]

        });
    },
    _onDataLoaded: function(store, data){
        var features = [];
        var pendingstories = data.length;
        Ext.Array.each(data, function(feature) {
            console.log(feature);
            var release= feature.get('Release');
            var f      = {
            FormattedID: feature.get('FormattedID'),
            Name       : feature.get('Name'),
            Release    : (release && release.Name) || 'None',
            Project    : feature.get('Project')._refObjectName,
            _ref       : feature.get("_ref"),
            StoryCount : feature.get('UserStories').Count,
            UserStories: []
            };

            var stories = feature.getCollection('UserStories');
            stories.load({
                fetch: ['FormattedID', 'Name'],
                callback: function(records, operation, success){
                    Ext.Array.each(records, function(story){
                        var number = story.get('DirectChildrenCount');  
                        if (number === 0) {
                            f.UserStories.push({_ref: story.get('_ref'),
                                FormattedID: story.get('FormattedID'),
                                Name: story.get('Name')
                            });}
                    }, this);

                    --pendingstories;
                    if (pendingstories === 0) {
                        this._createGrid(features);
                    }
                },
                scope: this
            });
            features.push(f);
        }, this);
    }             
});