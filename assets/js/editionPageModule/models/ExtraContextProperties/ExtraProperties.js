/**
 * Created by David on 22/12/2015.
 */

define([
    'jquery',
    './TrackProperties',
    './EcoreleveProperties',
    './EcollectionProperties',
    './PositionProperties'
    ,'./ReproProperties'
], function ($
    ,TrackProperties
    ,EcoreleveProperties
    ,EcollectionProperties
    ,PositionProperties
    ,ReproProperties
    ) {

    var contextExtraProperties = {
        "track" : TrackProperties
        ,"ecoreleve" : EcoreleveProperties
        ,"ecollection" : EcollectionProperties
        ,"position" : PositionProperties
        ,"repro" : ReproProperties
    };

    return {
        extraProperties: {},
        exceptions: {
            hide: {}
        },

        getExtraPropertiesDefaults: function(inputType, avoid) {
            var toret = {};
            if (!avoid)
                toret = this.getExtraPropertiesDefaults("all", true);

            $.each(this.extraProperties, function(index, value) {
                if (index == inputType) {
                    toret = _.extend(toret, value.defaults);
                    return(toret);
                }
            });

            return(toret);
        },

        getExtraPropertiesSchema: function(inputType, avoid) {
            var toret = {};
            if (!avoid)
                toret = this.getExtraPropertiesSchema("all", true);

            $.each(this.extraProperties, function(index, value) {
                if (index == inputType) {
                    toret = _.extend(toret, value.schema);
                    return(toret);
                }
            });

            return(toret);
        },

        getHideExceptionForProperty: function(input, property) {
            return(this.exceptions.hide[input] && this.exceptions.hide[input][property]);
        },

        getPropertiesContext : function (currentContext) {
            var propertiesContext = contextExtraProperties[window.context];
            if (currentContext)
                propertiesContext = contextExtraProperties[currentContext];
            if (!propertiesContext)
                return this;
            return propertiesContext;
        }
    };
});