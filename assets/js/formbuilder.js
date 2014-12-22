/**
 * @fileOverview formbuilder.js
 *
 * This file init formbuilder application using require JS
 * Create and run backbone router
 *
 * @author          MICELI Antoine (miceli.antoine@gmail.com)
 * @version         1.0
 */

define(['backbone', 'router', 'models/collection', 'views/main/mainView', 'backbone.radio'], function(Backbone, Router, Collection, MainView, Radio){

    var formbuilder = {

        importedFields : {},

        initialize : function(options) {

        	//	Init collection
            this.currentCollection = new Collection({}, {
                name: "Mon protocole"
            });

            //  Keep option
            this.URLOptions = options['URLOptions'];

            //  Init main view and render it
            this.mainView = new MainView({
                el         : options['el'],
                form       : this.currentCollection,
                URLOptions : options['URLOptions']
            });
            this.mainView.render();

            //  Backbone radio configuration

            //  We create to separate channel and keep cleans events configuration
            this.mainChannel    = Backbone.Radio.channel('global');
            this.formChannel    = Backbone.Radio.channel('form');
            this.requestChannel = Backbone.Radio.channel('request');

            //  Run event configuration
            this.initMainChannel();
            this.initFormChannel();
            this.initRequestChannel();

            //  Init router
            this.router = new Router(options);
            Backbone.history.start();
        },

        initMainChannel : function() {
            //  This event is receive from the router when user wants to see field configuration (see router.js)
            //  Send an event to the setting view
            this.mainChannel.on('getModel', _.bind(function(id) {
                this.mainChannel.trigger('getModel:return', this.currentCollection.get(id));
            }, this));


            //  Event receive from router when user wants to export current form in JSON
            //  Send an event to the router with current form in JSON DATA
            this.mainChannel.on('getJSON', _.bind(function() {
                this.mainChannel.trigger('getJSON:return', this.currentCollection.getJSON());
            }, this));


            //  This event is received when user want to dusplicate a field
            //  Add field copy to the collection
            this.mainChannel.on('copy', _.bind(function(modelID) {
                var modelToCopy     = this.currentCollection.get(modelID),
                    newModelAttr    = modelToCopy.toJSON();

                newModelAttr['id'] = this.currentCollection.length;
                this.currentCollection.addElement(modelToCopy.constructor.type + 'Field', newModelAttr);
            }, this));


            this.mainChannel.on('fieldConfiguration', _.bind(function(configuration) {
                $.post(this.URLOptions['configurationURL'], configuration).success(function() {
                    console.log ("on est bon")
                }).fail(function() {
                    console.log ("fail")
                })
            }, this))
        },

        initFormChannel : function() {
            //  Event receive when user wants to export a form
            //  We trigger on the mainchannel with current form as json data
            this.formChannel.on('export', _.bind(function(datas) {
                //  Set attribute with datas parameters

                this.formChannel.trigger('export:return', {
                    collection : this.currentCollection.getJSON(),
                    filename : datas['filename']
                });
            }, this));


            //  Update form with imported JSON data
            this.formChannel.on('JSONUpdate', _.bind(function(JSONUpdate) {
                this.currentCollection.updateWithJSON(JSONUpdate['form']);
            }, this));

            //  Event sent from the setting view when user validates form modification (name, description ...)
            //  See settingView.js
            this.formChannel.on('edition', _.bind(function(formValues) {
                this.currentCollection['name']        = formValues['name']
                this.currentCollection['description'] = formValues['description']
                this.currentCollection['keywords']    = formValues['keywords']
            }, this));

            //  Event received when user wants to save his form on the server
            this.formChannel.on('save', _.bind(function(formAsJSON) {
                $.ajax({
                    data        : formAsJSON,
                    type        : 'POST',
                    url         : this.URLOptions['saveURL'],
                    contentType : 'application/json',

                    //  Trigger event with ajax result on the formView
                    success: _.bind(function(res) {
                        this.formChannel.trigger('save:return', true);
                    }, this),
                    error: _.bind(function(jqXHR, textStatus, errorThrown) {
                        this.formChannel.trigger('save:return', false);
                    }, this)
                });
            }, this));
        },

        initRequestChannel : function() {
            this.requestChannel.on('saveConfiguration', _.bind(function(fieldConfiguration) {

                $.post(this.URLOptions['fieldConfigurationURL'], fieldConfiguration).success(function() {
                    alert ('field saved');
                }).fail(function() {
                    alert ('error !')
                })

            }, this));
        }

    };

  return formbuilder;

});