define([
    'jquery',
    'marionette',
    'text!../templates/FormPanelView.html',
    'tools',
    '../../Translater',
    'app-config',
    '../collection/staticInputs/ContextStaticInputs',
    './FieldViews',
    'i18n',
    'slimScroll'
], function($, Marionette, FormPanelViewTpl, tools,
            Translater, AppConfig, ContextStaticInputs, FieldViews) {

    var staticInputs = ContextStaticInputs;

    /**
     * The form view represents the current form. It's a the edition module main view.
     */
    var FormPanelView = Backbone.Marionette.View.extend({
        events : {
            'click #export'       : 'export',
            'click .sizepreview'  : 'sizepreview',
            'click #datasImg'     : 'popDatasImg'
        },

        template : function() {
            return _.template(FormPanelViewTpl) ({
                collection : this.collection.getAttributesValues(),
                context: this.context,
                topcontext: this.topcontext,
                readonly: this.readonly,
                columns: this.columns
            });
        },

        initialize : function(options, readonly) {
            this.topcontext = AppConfig.topcontext;
            this.URLOptions = options.URLOptions;
            this.readonly = readonly;

            _.bindAll(this, 'template', 'save');
        },

        updateCollection: function(collection) {
            this.collection = collection;
            this._view = {};

            //  Bind collection events
            this.collection.off('add', this.addElement).on('add', this.addElement, this);
            this.collection.off('remove', this.addElement).on('remove', this.removeElement, this);

            if (this.context === this.collection.context) {
                // no context change, we're done
                return;
            }

            // update context & refresh template with updated columns
            this.context = this.collection.context;
            this.columns = tools.getContextConfig(this.context, "editColumns");
            this.$el = $(this.template());

            // update statics
            setStatics(this.context);
        },

        destroy: function() {
            // override & disable destroy mechanism
            // triggered by a new EditionPageLayout.render()
        },

        removeElement : function() {
            this.updateFieldCount();
        },

        addElement: function (newModel) {
            var viewClassName = newModel.constructor.type + "FieldView";

            if (newModel.constructor.type === "Numeric") {
                newModel.on('change:decimal', function (e) {
                    e.baseSchema['precision']['fieldClass'] = e.get('decimal') ? "advanced" : "";
                })
            }

            // FieldView exists?
            if (!FieldViews[viewClassName]) {
                tools.swal("error", "modal.field.error", "modal.field.errorMsg");
                return;
            }

            // prepare target element for field rendering
            var id = "dropField" + newModel['id'];
            var $field = $("<div>").addClass("dropField").attr("id", id);

            // check that order is not set to last (converted field)
            var order = newModel.get('order');
            if (order >= this.$el.find(".drop").children().length) {
                this.$el.find('.drop').append($field);
            } else if (order === 0) {
                this.$el.find('.drop').prepend($field);
            } else {
                this.$el.find(".drop > tr:nth-child(" + order + ")").after($field);
            }

            // populate field / readonly if compulsory input
            var vue = new FieldViews[viewClassName]({
                el: '#' + id,
                model: newModel,
                collection: this.collection,
                urlOptions: this.URLOptions,
                $container: this.$el.find(".drop"),
                context: this.context,
                columns: this.columns
            });
            if (vue !== null) {
                vue.render();
                this._view[id] = vue;
                if (newModel.get('new')) {
                    // scroll to bottom if element was just inserted
                    this.$el.find('#scrollSection').slimScroll({ scrollTo: "99999px" });
                }
            }

            $(".actions").i18n();
            this.updateFieldCount();
        },

        updateFieldCount : function() {
            this.$el.find('#count').text($.t("fieldCount.field", {
                count: this.collection.length
            }));
        },

        refresh: function() {
            // console.log("refresh")
            this.updateName();
            this.$el.find('.drop').empty();
            this.collection.createFields();

            this.$el.find('.drop').disableSelection();
            this.updateFieldCount();

            // stop here if readonly
            if (this.collection.readonly) {
                // re-init slimscroll
                this.$el.find('#scrollSection')
                .slimScroll({destroy: true})
                .slimScroll({
                    height: 'calc(100% - 76px)',
                    railVisible: true,
                    alwaysVisible: true
            });
                return;
            }

            // console.log("refresh2")
            // init sortable section
            this.$el.find('.drop').sortable({
                axis: "y",
                handle : '.handle',
                cursor: "move",
                items: "tr:not(.static)",
                start: function(e) {
                    var $el = $(e.originalEvent.target).parent();
                    var $container = $el.parent();
                    var $placeholder = $container.find(".ui-sortable-placeholder");

                    // place the element being dragged at the end
                    // of the table: its absolute position breakse the
                    // table display in case it is the first row
                    $el.insertAfter(".drop tr:last-of-type");

                    // for each placeholder's td, apply css class of any non-placeholder
                    // <tr>.. this is because we cannot target css columns with :nth-of-type,
                    // because each column type has a specific sizing and can be placed
                    // anywhere in the grid with config
                    $.each($container.find("tr:not('.ui-sortable-placeholder') td"),
                        function(i, elem) {
                            $($placeholder.find("td")[i]).attr("class", $(elem).attr("class"));
                        }
                    );
                },
                update : _.bind(function() {
                    // update fields indexes
                    for (var v in this._view) {
                        this._view[v].updateIndex($('#' + v).index());
                    }
                }, this)
            });

            // re-init slimscroll
            this.$el.find('#scrollSection')
                .slimScroll({destroy: true})
                .slimScroll({
                    height: 'calc(100% - 76px)',
                    railVisible: true,
                    alwaysVisible: true
            });
        },

        onRender : function() {
            //  By default marionette wrap template with a div
            //  We remove it and update view HTML element reference
            this.$el = this.$el.children();
            this.$el.unwrap();
            this.setElement(this.$el);

            // run i18next translation in the view context
            this.$el.i18n();
        },

        save : function() {
            this.collection.save();
        },

        updateName: function () {
            this.$el.find('#collectionName').text(this.collection.name);
            if (this.collection.originalID && this.collection.originalID > 0)
            {
                this.$el.find('#formOriginalIdArea').show();
                this.$el.find('#formOriginalID').text(this.collection.originalID);
                if (this.context != "track" && $("#datasImg").length > 0)
                {
                    $("#datasImg").remove();
                }
            }
        },

        popDatasImg: function(){
            if (this.context == "track") {
                tools.swal("info",
                    "Datas linked to the form<br />'"+this.collection.name+"'<br />",
                    "<span id='formDatasArea'><span id='formDatasLoading'>Loading datas ...<br/><br/>"+
                    "<img style='height: 20px;' src='assets/images/loader.gif' /></span></span>", {
                        html: true
                    });
                $.ajax({
                    data: {},
                    type: 'GET',
                    url:  this.URLOptions.trackFormWeight + "/" + $("#formOriginalID").html(),
                    contentType: 'application/json',
                    crossDomain: true,
                    success: _.bind(function (data) {
                        data = JSON.parse(data);
                        $("#formDatasLoading").remove();
                        $.each(data.FormWeight, function(index, value){
                            $("#formDatasArea").append("<span>"+index+" : "+value+" saisies</span><br/>");
                        });
                    }, this),
                    error: _.bind(function (xhr, ajaxOptions, thrownError) {
                        console.log("Ajax Error: " + xhr, ajaxOptions, thrownError);
                    }, this)
                });
            }
        }
    });

    var setStatics = function(staticsToSet){
        var context = staticsToSet ||  window.context || $("#contextSwitcher .selected").text();
        if (context.toLowerCase() != "all")
            staticInputs = ContextStaticInputs.getStaticMode(context);
    };

    return FormPanelView;

});
