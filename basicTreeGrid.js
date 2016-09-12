Ext.define('CustomApp', {
  extend: 'Rally.app.App',
  componentCls: 'app',

  launch: function() {
      Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
          models: ['userstory', 'defect'],
          autoLoad: true,
          enableHierarchy: true
      }).then({
          success: this._onStoreBuilt,
          scope: this
      });
  },

  _onStoreBuilt: function(store) {
      var modelNames = ['userstory', 'defect'];
      var context = this.getContext();
      this.add({
          xtype: 'rallygridboard',
          modelNames: modelNames,
          context: context,
          enableHierarchy: 'true',
          toggleState: 'grid',
          plugins: [
              'rallygridboardaddnew',
              {
                  ptype: 'rallygridboardcustomfiltercontrol',
                  filterControlConfig: {
                      modelNames: modelNames
                  }
              },
              {
                  ptype: 'rallygridboardactionsmenu',
                  menuItems: [
                      {
                          text: 'Export...',
                          handler: function() {
                              window.location = Rally.ui.grid.GridCsvExport.buildCsvExportUrl(
                                  this.down('rallygridboard').getGridOrBoard());
                          },
                          scope: this
                      },
                      {
                          text: 'Print...',
                          handler: function () {
                              Ext.create('Rally.ui.grid.TreeGridPrintDialog', {
                                  grid: this.down('rallygridboard').getGridOrBoard(),
                                  treeGridPrinterConfig: {
                                      largeHeaderText: 'Tasks'
                                  }
                              });
                          },
                          scope: this
                      }
                  ],
                  buttonConfig: {
                      iconCls: 'icon-export'
                  }
              }
          ],
          cardBoardConfig: {
              attribute: 'ScheduleState'
          },
          gridConfig: {
              store: store,
              enableRanking: true,
              defaultSortToRank: true,
              enableBulkEdit: true,
              enableInlineAdd: true,
              showRowActionsColumn: true,
              columnCfgs: [
                'FormattedID',
                'Name',
                'Release',
                'Iteration',
                'ScheduleState',
                'PlanEstimate',
                'TaskActualTotal',
                'Owner',
                'Tags'
              ]
          },
          height: this.getHeight()
      });
  }
});            