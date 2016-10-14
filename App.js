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
            itemId: 'successCriteriaCombobox',
            cls: 'success-criteria-combo-box'
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
        
        this.down('#successCriteriaCombobox').add({
            xtype: 'rallyfieldvaluecombobox',
            itemId: 'successCriteriaCombobox',
            model: 'UserStory',
            field: 'c_SuccessCriteria',
            allowNoEntry: true,
            noEntryText: 'All Success Criteria',
            listeners: {
                scope: this,
                select: this._onSelect
            },
        });
        
        this.down('#milestoneCombobox').add({
            xtype: 'rallymilestonecombobox',
            itemId: 'stateComboBox',
            allowNoEntry: true,
            noEntryText: 'All Milestones',
            model: ['userstory'],
            listeners: {
                scope: this,
                select: this._onSelect,
                ready: this._initStore
            }
        });
   },
    // _getStateFilter: function() {
    //     return {
    //         property: 'FeatureMilestones',
    //         operator: '=',
    //         value: this.down('#stateComboBox').getRawValue()
    //     };
    // },
    _getMultiFilter: function() {
        
        var iterationFilter, releaseFilter;
        
        if (this.down('#successCriteriaCombobox').items.items[0].rawValue !== "All Success Criteria") {
            var successCriteriaValue = '';
            if(this.down('#successCriteriaCombobox').items.items[0].rawValue === "Yes") {
                successCriteriaValue = true;
            } else {
                successCriteriaValue = false;
            }
            iterationFilter = {
                property: 'FeatureUserStorySuccessCriteria',
                operator: '=',
                value: successCriteriaValue
            };
        }
        
        if (this.down('#stateComboBox').getRawValue() !== "All Milestones") {
            releaseFilter = {
                property: 'FeatureMilestones',
                operator: '=',
                value: this.down('#stateComboBox').getRawValue()
            };
        }
        
        if (!releaseFilter && !iterationFilter) {
            this._grid.getStore().reload();
            return;
        } else if (releaseFilter && iterationFilter ) {
            return (Ext.create('Rally.data.QueryFilter', releaseFilter)).and(Ext.create('Rally.data.QueryFilter', iterationFilter));
        } else if (!releaseFilter && iterationFilter) {
            return Ext.create('Rally.data.QueryFilter', iterationFilter);
        } else {
            return Ext.create('Rally.data.QueryFilter', releaseFilter);
        }  
    },
    _onSelect: function() {
        var store = this._grid.getStore();
    
        store.clearFilter(true);
        store.filter(this._getMultiFilter());
    },
    // _onSelect: function() {
    //     var store = this._grid.getStore();
    
    //     store.clearFilter(true);
    //     if (this.down('#stateComboBox').getRawValue() !== "-- No Entry --") {
    //         store.filter(this._getStateFilter());
    //     } else {
    //         store.reload();
    //     }
    // },
    // _getSuccessCriteriaFilter: function() {
    //     var successCriteriaValue = '';
    //     if(this.down('#successCriteriaCombobox').items.items[0].rawValue === "Yes") {
    //         successCriteriaValue = true;
    //     } else {
    //         successCriteriaValue = false;
    //     }
    //     return {
    //         property: 'FeatureUserStorySuccessCriteria',
    //         operator: '=',
    //         value: successCriteriaValue
    //     };
    // },
    // _onSelectSuccessCriteria: function() {
    //     var store = this._grid.getStore();
    
    //     store.clearFilter(true);
    //     if (this.down('#successCriteriaCombobox').items.items[0].rawValue !== "-- No Entry --") {
    //         store.filter(this._getSuccessCriteriaFilter());
    //     } else {
    //         store.reload();
    //     }
    // },
   _initStore: function() {
        Ext.create('Rally.data.wsapi.Store', {
            model: 'PortfolioItem/Feature',
            autoLoad: true,
            remoteSort: false,
            fetch: true,
            limit: Infinity,
            listeners: {
                load: this._onDataLoaded,
                scope: this
            }
        });
    },
    _onDataLoaded: function(store, data) {
        var features = [],
            pendingTestCases = data.length;
        _.each(data, function(feature) {
            var f = {
                FormattedID: feature.get("FormattedID"),
                _ref: feature.get("_ref"),
                FeatureNumericID: Number(feature.get("FormattedID").replace(/\D+/g, '')),
                FeatureName: feature.get("Name"),
                FeatureRelease: "",
                FeatureState: "",
                FeatureWorkItemType: feature.get("c_WorkItemType"),
                UserStories: [],
                TestCases: [],
                FeatureMilestones: []
            };
            
            if (f.FeatureWorkItemType === "Functional") {
                if (feature.data.Release) {
                    f.FeatureRelease = feature.data.Release._refObjectName;
                    if (f.FeatureRelease !== "Unscheduled") {
                        f.FeatureReleaseNumericID = Number(f.FeatureRelease.replace(/\D+/g, ''));
                    } else {
                        f.FeatureReleaseNumericID = 0;
                    }
                }
                if (feature.data.State) {
                    f.FeatureState = feature.data.State._refObjectName;
                }

                if (feature.data.Milestones && feature.data.Milestones.Count > 0) {
                    var milestones = [];
                    _.each(feature.data.Milestones._tagsNameArray, function(milestone){
                        milestones.push(milestone.Name);
                    });
                    f.FeatureMilestones = milestones.join(', ');
                }
                
                feature.getCollection("UserStories", { fetch: ["FormattedID", "Name", "ScheduleState", "c_SuccessCriteria", "TestCases"] }).load({
                    callback: function(records) { 
    	            	_.each(records, function(userstory) {
    	            	        var reference = userstory.get("FormattedID");
        	            	    f.UserStories.push({
        	            	        _ref: userstory.get("_ref"), 
                    	            FormattedID: reference,
                    	            StoryNumericID: Number(userstory.get("FormattedID").replace(/\D+/g, '')),
                    	            Name: userstory.get("Name"),
                    	            ScheduleState: userstory.get("ScheduleState"),
                    	            TestCaseCount: userstory.get("TestCases").Count,
                    	            SuccessCriteria: userstory.get("c_SuccessCriteria")
        	            	    });
    	            	    
        	            		userstory.getCollection("TestCases", { fetch: ["FormattedID", "Name"] }).load({ 
                                	callback: function(records) {
                    	            	_.each(records, function(testcase) {
                    	            		f.TestCases.push({ 
                    	            			_ref: testcase.get("_ref"), 
                    	            			FormattedID: testcase.get("FormattedID"), 
                    	            			Name: testcase.get("Name"),
                    	            			StoryName: reference
                    	            		}); 
                    	            	}, this);
                    
                    	            	--pendingTestCases;
                                        if (pendingTestCases === 0) {
                                            this._makeGrid(this._createMatrix(features));
                                        }
                                    },
                                    scope: this
                                });
        	 
    	            	}, this);
                    },
                    scope: this
                });
                features.push(f);
            }
        }, this);
    },
    
    _createMatrix: function(data) {
        var rows = [];
        _.each(data, function(row) {
            if (row.UserStories.length > 0) {
                _.each(row.UserStories, function(story) {
                    
                    var r = {
                        _ref: row._ref,
                        FormattedID: row.FormattedID,
                        FeatureName: row.FeatureName,
                        FeatureNumericID: row.FeatureNumericID,
                        FeatureMilestones: row.FeatureMilestones,
                        FeatureRelease: row.FeatureRelease,
                        FeatureReleaseNumericID: row.FeatureReleaseNumericID,
                        FeatureState: row.FeatureState,
                        FeatureWorkItemType: row.FeatureWorkItemType,
                        FeatureUserStory: [],
                        FeatureUserStoryNumericID: "",
                        FeatureUserStoryName: "",
                        FeatureUserStoryState: "",
                        FeatureUserStoryTestCaseCount: 0,
                        FeatureUserStoryTestCases: [],
                        FeatureUserStorySuccessCriteria: ''
                    };
                    
                    if (row.TestCases.length > 0) {
                        var count = 0;
                        _.each(row.TestCases, function(testcase) {
                            if (testcase.StoryName === story.FormattedID) {
                                ++count;
                                r.FeatureUserStoryTestCases.push({FormattedID: testcase.FormattedID, _ref: testcase._ref});
                            }
                        });
                        r.FeatureUserStoryTestCaseCount = count;
                    }
                    
                    r.FeatureUserStory.push({FormattedID: story.FormattedID, _ref: story._ref});
                    r.FeatureUserStoryNumericID = story.StoryNumericID;
                    r.FeatureUserStoryName = story.Name;
                    r.FeatureUserStoryState = story.ScheduleState;
                    r.FeatureUserStorySuccessCriteria = story.SuccessCriteria;
                    rows.push(r);
                });
            }
        });
        
        return rows;
    },
    
    _makeGrid:function(stories){
        this._myMask.hide();
        var store = Ext.create('Rally.data.custom.Store', {
            data: stories,
            sorters: [
                { property: 'FeatureNumericID', direction: 'ASC' },
                { property: 'FeatureUserStoryNumericID', direction: 'ASC'}
            ],
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
                text: "Feature ID", dataIndex: "FormattedID", xtype: "templatecolumn",
            	tpl: Ext.create("Rally.ui.renderer.template.FormattedIDTemplate"),
            	getSortParam: function() {
            	    return "FeatureNumericID";
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
            	text: "User Story ID", dataIndex: "FeatureUserStory",
            	renderer: function(value) {
                    return value ? '<a href="' + Rally.nav.Manager.getDetailUrl(value[0]) + '" target="_blank">' + value[0].FormattedID + "</a>" : void 0;
                },
            	getSortParam: function() {
            	    return "FeatureUserStoryNumericID";
                }
            }, { 
            	text: "User Story Name", dataIndex: "FeatureUserStoryName", flex: 1
            }, {
                text: "Story Schedule State", dataIndex: "FeatureUserStoryState"
            }, { 
            	text: "Test Case Count", dataIndex: "FeatureUserStoryTestCaseCount", sortable: false
            }, {
                text: "Test Case ID", dataIndex: "FeatureUserStoryTestCases",
                renderer: function(value) {
                    var html = [];
                    Ext.Array.each(value, function(testcase) { 
                	    html.push('<a href="' + Rally.nav.Manager.getDetailUrl(testcase) + '" target="_blank">' + testcase.FormattedID + "</a>");
                    });
                    return html.join("</br>");
                },
                getSortParam: function() {
            	    return "TestCaseCount";
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
             var rowData = '';
            _.each(cols, function(col) {
                var text = '';
                var fieldName = col.dataIndex;
                if (fieldName === "FeatureUserStoryTestCaseCount") {
                    text = record["FeatureUserStoryTestCaseCount"].toString();
                } else if (fieldName === "FeatureUserStory"){
                    text += record["FeatureUserStory"][0].FormattedID;
                } else if (fieldName === "FeatureUserStoryTestCases"){
                    data += this._getTestCaseRowsForCSV(record["FeatureUserStoryTestCases"], rowData, record["FeatureUserStoryTestCaseCount"], record["FeatureMilestones"]);
                } else {
                    text = record[fieldName];
                }
                var cleanText = this._getFieldTextAndEscape(text);
                data +=  cleanText + ',';
                rowData += cleanText + ',';
            }, this);
            data += this._getFieldTextAndEscape(record["FeatureMilestones"]) + "\r\n";
        }, this);

        return data;
    },
    _getTestCaseRowsForCSV: function(testcases, storyRowStr, testcaseCount, milestone) {
        var testcaseRows = '';
        _.each(testcases, function(testcase, index) {
            if (index === 0) {
                testcaseRows += this._getFieldTextAndEscape(testcase.FormattedID);
            } else {
                testcaseRows += storyRowStr + this._getFieldTextAndEscape(testcase.FormattedID);
            }
            
            if(testcaseCount > 1 && index !== testcaseCount - 1 ) {
                testcaseRows += ',' +  this._getFieldTextAndEscape(milestone) + "\r\n";
            }
        }, this);
        
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