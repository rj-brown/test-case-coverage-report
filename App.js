Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items: [
        {
            xtype: 'container',
            itemId: 'exportBtn',
            cls: 'export-button'
        },
        {
            xtype: 'container',
            itemId: 'milestoneCombobox',
            cls: 'milestone-combo-box'
        },
        {
            xtype: 'container',
            itemId: 'gridContainer'
        }
    ],
    launch: function() {
        
        this._myMask = new Ext.LoadMask(Ext.getBody(), {msg:"Loading data..."});
        this._myMask.show();
        
        this.down('#milestoneCombobox').add({
            xtype: 'rallymilestonecombobox',
            itemId: 'stateComboBox',
            allowNoEntry: true,
            model: ['userstory'],
            listeners: {
                scope: this,
                select: this._onSelect,
                ready: this._initStore
            }
        });
   },
    _getStateFilter: function() {
        return {
            property: 'FeatureMilestones',
            operator: '=',
            value: this.down('#stateComboBox').getRawValue()
        };
    },
    _onSelect: function() {
        var store = this._grid.getStore();
    
        store.clearFilter(true);
        if (this.down('#stateComboBox').getRawValue() !== "-- No Entry --") {
            store.filter(this._getStateFilter());
        }
    },
   _initStore: function() {
        Ext.create('Rally.data.wsapi.Store', {
            model: 'UserStory',
            autoLoad: true,
            remoteSort: false,
            fetch:[
        	    "FormattedID", 
            	"Name",
            	"Release",
            	"TestCases", 
            	"Feature",
            	"WorkItemType",
            	"Milestones",
            	"ScheduleState"
        	],
            limit: Infinity,
            listeners: {
                load: this._onDataLoaded,
                scope: this
            }
        });
       
        this._featureStore = Ext.create('Rally.data.wsapi.Store', {
            model: 'PortfolioItem',
            autoLoad: true,
            remoteSort: false,
            fetch:[
        	    "FormattedID", 
            	"State"
        	],
            limit: Infinity
       });
    },
    _onDataLoaded: function(store, data) {
        var stories = [],
            pendingTestCases = data.length;
        _.each(data, function(story) {
            var s = { 
            	Feature: story.get("Feature"), 
            	FormattedID: story.get("FormattedID"), 
            	StoryNumericID: Number(story.get("FormattedID").replace(/\D+/g, '')),
            	Name: story.get("Name"), 
            	Release: (story.get("Release") ? story.get("Release").Name : ""),
            	_ref: story.get("_ref"), 
            	TestCaseCount: story.get("TestCases").Count, 
            	TestCases: [],
            	WorkItemType: story.get("WorkItemType"),
            	StoryScheduleState: story.get("ScheduleState"),
            	FeatureState: ''
            };
            
            if (s.Feature) {
                s.FeatureName = s.Feature.Name;
                s.FeatureWorkItemType = s.Feature.c_WorkItemType;
                if (s.Feature.Release) {
                    s.FeatureRelease = s.Feature.Release.Name;
                } else {
                    s.FeatureRelease = "Unscheduled";
                }

                //s.FeatureNumericID is an integer, so that the Feature ID sort will compare numbers instead of strings
                s.FeatureNumericID = Number(s.Feature.FormattedID.replace(/\D+/g, ''));
                
                var milestones = [];
                _.each(s.Feature.Milestones._tagsNameArray, function(milestone){
                     milestones.push(milestone.Name);
                });
                s.FeatureMilestones = milestones.join(', ');
                
                _.each(this._featureStore.data.items, function(feature){
                    if (s.Feature.FormattedID ===  feature.data.FormattedID) {
                        if (feature.data.State) {
                            s.FeatureState = feature.data.State._refObjectName;
                        }
                    }
                });
            }
            
            if (s.FeatureRelease) {
                if (s.FeatureRelease !== "Unscheduled") {
                    s.FeatureReleaseNumericID = Number(s.FeatureRelease.replace(/\D+/g, ''));
                } else {
                    s.FeatureReleaseNumericID = 0;
                }
            }
            
            var testcases = story.getCollection("TestCases", { fetch: ["FormattedID"] });
            testcases.load({ 
            	callback: function(records) { 
	            	_.each(records, function(testcase) { 
	            		s.TestCases.push({ 
	            			_ref: testcase.get("_ref"), 
	            			FormattedID: testcase.get("FormattedID"), 
	            			Name: testcase.get("Name") 
	            		}); 
	            	}, this);

	            	--pendingTestCases;
                    if (pendingTestCases === 0) {
                        this._makeGrid(stories);
                    }
                },
                scope: this
            });

            if (s.Feature && s.FeatureWorkItemType === "Functional") {
                stories.push(s);
            }
        }, this);
    },
    
    _makeGrid:function(stories){
        this._myMask.hide();
        var store = Ext.create('Rally.data.custom.Store', {
            data: stories,
            proxy: {
                type:'memory'
            }
        });
        this._stories = stories;
        this._grid = Ext.create('Rally.ui.grid.Grid',{
            itemId: 'storiesGrid',
            store: store,
            showRowActionsColumn: false,
            showPagingToolbar: false,
            columnCfgs: [
            {
                text: "Feature ID", dataIndex: "Feature", width: 65,
                getSortParam: function() {
                    return "FeatureNumericID";  
                },
                renderer: function(value) {
                    return value ? '<a href="' + Rally.nav.Manager.getDetailUrl(value) + '">' + value.FormattedID + "</a>" : void 0;
                }
            }, {
                text: "Feature Name", dataIndex: "FeatureName", flex: 1
            }, {
                text: "Feature PSI", dataIndex: "FeatureRelease", width: 65,
                getSortParam: function() {
                    return "FeatureReleaseNumericID";  
                }            
            }, {
                text: "Feature Work Item Type", dataIndex: "FeatureWorkItemType",
            }, {
                text: "Feature State", dataIndex: "FeatureState", 
            }, { 
            	text: "User Story ID", dataIndex: "FormattedID", xtype: "templatecolumn",
            	tpl: Ext.create("Rally.ui.renderer.template.FormattedIDTemplate"),
            	getSortParam: function() {
            	    return "StoryNumericID";
                }
            }, { 
            	text: "User Story Name", dataIndex: "Name", flex: 1
            }, {
                text: "Story Schedule State", dataIndex: "StoryScheduleState"
            }, { 
            	text: "Test Case Count", dataIndex: "TestCaseCount", sortable: false
            }, {
                text: "Test Case ID", dataIndex: "TestCases",
                renderer: function(value) {
                    var html = [];
                    Ext.Array.each(value, function(testcase) { 
                	    html.push('<a href="' + Rally.nav.Manager.getDetailUrl(testcase) + '">' + testcase.FormattedID + "</a>");
                    });
                    return html.join("</br>");
                }
            }]
        });
        this.down('#gridContainer').add(this._grid);
        this.down('#exportBtn').add({
            xtype: 'rallybutton',
            text: 'Export to CSV',
            handler: this._onClickExport,
            scope: this
        });
    },

    _onClickExport: function(){
        var data = this._getCSV();
        window.location = 'data:text/csv;charset=utf8,' + encodeURIComponent(data);
    },
    
    _getCSV: function () {
        
        var cols = this._grid.columns;
        var data = '';

        _.each(cols, function(col) {
            data += this._getFieldTextAndEscape(col.text) + ',';
        }, this);
        data += 'Milestones,';
        data += "\r\n";
        _.each(this._stories, function(record) {
            var featureData = record["Feature"];
            var storyData = '';
            _.each(cols, function(col) {
                var text = '';
                var fieldName = col.dataIndex;
                if (fieldName === "Feature" && featureData) {
                    text = featureData.FormattedID;
                } else if (fieldName === "TestCaseCount") {
                    text = record[fieldName].toString();
                } else if (fieldName === "TestCases"){
                    data += this._getTestCaseRowsForCSV(record[fieldName], storyData, record["TestCaseCount"], featureData);
                } else {
                    text = record[fieldName];
                }
                var cleanText = this._getFieldTextAndEscape(text);
                data +=  cleanText + ',';
                storyData += cleanText + ',';
            }, this);
            data += this._getMilestonesForCSV(featureData);
            data += "\r\n";
        }, this);

        return data;
    },
    _getMilestonesForCSV: function(feature) {
        var milestones = '';
        _.each(feature.Milestones._tagsNameArray, function(milestone) {
            milestones += this._getFieldTextAndEscape(milestone.Name) + ' ';
        }, this);
        return milestones;
    },
    _getTestCaseRowsForCSV: function(testcases, storyRowStr, testcaseCount, feature) {
        //In this app in Rally, stories with multiple testcases group all the testcases into one table cell
        //However, when exporting the data the requirement is for each 
        //testcase to get it's own table row in the CSV, with all the story data duplicated.

        var self = this;
        var testcaseRows = '';
        
        _.each(testcases, function(testcase, index) {
            if (index === 0) {
                testcaseRows += self._getFieldTextAndEscape(testcase.FormattedID);
            } else {
                testcaseRows += storyRowStr + self._getFieldTextAndEscape(testcase.FormattedID);
            }
            
            if(testcaseCount > 1 && index !== testcaseCount - 1 ) {
                testcaseRows += ',' + self._getMilestonesForCSV(feature) + "\r\n";
            }
        });
        
        return testcaseRows;
    },
    _getFieldTextAndEscape: function(fieldData) {
        var string  = this._getFieldText(fieldData);  
        return this._escapeForCSV(string);
    },
    _getFieldText: function(fieldData) {
        var text;
        if (fieldData === null || fieldData === undefined || !fieldData.match) {
            text = '';
        } else if (fieldData._refObjectName) {
            text = fieldData._refObjectName;
        }else {
            text = fieldData;
        }

        return text;
    },
     _escapeForCSV: function(string) {
        if (string.match(/,/)) {
            if (!string.match(/"/)) {
                string = '"' + string + '"';
            } else {
                string = string.replace(/,/g, ''); 
            }
        }
        return string;
    }
});