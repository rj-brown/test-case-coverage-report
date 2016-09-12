Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    launch: function() {
        this.add({
            xtype: 'rallygrid',
            columnCfgs: [
                'FormattedID',
                'Name',
                'Project',
                'Release',
                {
                    text: 'Test Case Count', dataIndex: 'TestCaseCount'
                },
                {
                    text: 'Test Cases', dataIndex: 'TestCases', minWidth: 200,
                    renderer: function(value) {
                        var html = [];
                        Ext.Array.each(value, function(testcase){
                            html.push('<a href="' + Rally.nav.Manager.getDetailUrl(testcase) + '">' + testcase.FormattedID + '</a>');
                        });
                        return html.join('</br>');
                    }
                }
            ],
            context: this.getContext(),
            features: [{
                ftype: 'groupingsummary',
                groupHeaderTpl: '{name} ({rows.length})'
            }],
            storeConfig: {
                model: 'userstory',
                groupField: 'Feature',
                groupDir: 'ASC',
                fetch: ['Project', 'Release', 'Feature', 'PortfolioItem', 'Parent', 'TestCaseCount', 'TestCases'],
                getGroupString: function(record) {
                    var feature = record.get('Feature');
                    return (feature.FormattedID + " - " + feature.Name);
                }
            }
        });
    }
});
