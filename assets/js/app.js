/**
 * This is the javascript that supports our thin HTML "client" to help it 
 * interface with our REST API.
 *
 *
 * @package assman
 */
 
if (typeof jQuery == 'undefined') {
    alert('jQuery is not loaded. Assman HTML client cannot load.');
}
else {
    console.debug('[assman html client]: jQuery loaded.');
}

/**
 * Wipe the tab clean and (re)draw the assets tab including groups for assets.
 */
function draw_tab() {
    jQuery('#page_assets').html('');
    Groups = [];
    var arrayLength = assman.PageAssets.length;
    for (var i = 0; i < arrayLength; i++) {
        jQuery('#page_assets').append( assman.tpls.page_asset(assman.PageAssets[i]));
        if (assman.PageAssets[i].group) {
            Groups.push(assman.PageAssets[i].group);
        }
    }
    
    Groups = array_unique(Groups);
    
    jQuery('#asset_category_filters').html('<li class="all first"><a href="#">All</a></li>');
    var arrayLength = Groups.length;
    for (var i = 0; i < arrayLength; i++) {
        if (Groups[i]) {
            jQuery('#asset_category_filters').append( assman.tpls.category({"group": Groups[i]}));
        }
    }  

    jQuery("#page_assets").sortable({
        change: function( event, ui ) {
            console.log(ui);
        }
    });
    jQuery("#page_assets").disableSelection();


    // Filter page_assets
    // Clone page_assets items to get a second collection for Quicksand plugin (image gallery)
    var $portfolioClone = jQuery("#page_assets").clone();
    
    // Attempt to call Quicksand on every click event handler
    jQuery("#asset_category_filters a").click(function(e){
        
        jQuery("#asset_category_filters li").removeClass("current");
        jQuery("#asset_category_filters li").removeClass("first"); 
        
        // Get the class attribute value of the clicked link
        var $filterClass = jQuery(this).parent().attr("class");

        if ( $filterClass == "all" ) {
            var $filteredPortfolio = $portfolioClone.find("li");
        } else {
            var $filteredPortfolio = $portfolioClone.find("li[data-type~=" + $filterClass + "]");
        }
        
        // Call quicksand
        jQuery("#page_assets").quicksand( $filteredPortfolio, { 
            duration: 800, 
            easing: 'swing' 
        });

        jQuery(this).parent().addClass("current");
    })
}

function define_dialog_boxes() {
    // Delete Asset
    jQuery( "#delete_asset_modal" ).dialog({
        autoOpen: false,
        open: function( event, ui ) {
            jQuery.colorbox.close();     
        },
        height: 330,
        width: 500,
        modal: true,
        closeOnEscape: true,
        buttons: {
            "Delete": function() {
                //alert('Delete: '+ jQuery(this).data('asset_id'));
                var asset_id = jQuery(this).data('asset_id');
                console.log('Deleting: '+asset_id);
                var page_id = assman.page_id;
                assapi('pageasset','delete',{
                    asset_id: asset_id,
                    page_id: page_id
                });
                var arrayLength = assman.PageAssets.length;
                for (var i = 0; i < arrayLength; i++) {
                    if (assman.PageAssets[i].asset_id == asset_id) {
                        assman.PageAssets.splice(i,1); // unset
                    }
                }
          		jQuery('#page-asset-'+asset_id).remove();
          		draw_tab();
                jQuery( this ).dialog( "close" );
            },
            "Remove from Page": function() {
                var asset_id = jQuery(this).data('asset_id');
                console.log('Removing: '+asset_id);
                var page_id = assman.page_id;
                assapi('pageasset','remove',{
                    asset_id: asset_id,
                    page_id: page_id
                });
                var arrayLength = assman.PageAssets.length;
                for (var i = 0; i < arrayLength; i++) {
                    if (assman.PageAssets[i].asset_id == asset_id) {
                        assman.PageAssets.splice(i,1); // unset
                    }
                }
          		jQuery('#page-asset-'+asset_id).remove();
          		draw_tab();
                jQuery( this ).dialog( "close" );
            },
            "Cancel": function() {
                jQuery( this ).dialog( "close" );
            }
        }   
    });

    // Define Dropzone for Assets 
    // This does create an error on save: "Dropzone already attached." boo.
    var myDropzone = new Dropzone("div#asset_upload", {
        url: assman.controller_url+'&class=asset&method=create'
    });    
    // Refresh the list on success (append new tile to end)
    // WARNING: if there's a fatal PHP error in the controller, you'll still end up here!
    myDropzone.on("success", function(file,response) {
        console.log('[Dropzone Success]', file, response);
        if (response.status == "success") {
            // Write data back to parent JS
            var asset_id = response.data.fields.asset_id;
            assman.PageAssets.push({asset_id:asset_id,group:"",is_active:1,"Asset":response.data.fields});
            draw_tab();
            jQuery(".dz-preview").remove();
       } 
       else {                           
            console.log('There was a problem with your image upload.');
            jQuery(".dz-success-mark").hide();
            jQuery(".dz-error-mark").show();
            show_error(response.data.msg);
       }
    });    
    myDropzone.on("error", function(file,errorMessage) {
        console.log('[Dropzone Error]',file, errorMessage);
    });
    // called after success
    //myDropzone.on("complete", function(file,errorMessage) {
    //    console.log('[Dropzone Complete]',file, errorMessage);
    //});


    // Drag Drop Item Delete
    jQuery( "#trash-can" ).droppable({
            
        over: function( event, ui ) {
            jQuery(this).addClass('over-trash');
        },
        out: function(event, ui) {
            var id = jQuery(ui.draggable).attr('id');
            jQuery(this).removeClass('over-trash');
        },
        drop: function( event, ui ) {
            var id = jQuery(ui.draggable).attr('id');
            var asset_id = jQuery(ui.draggable).find('img').data('asset_id');
            if (confirm("Are you Sure you want to Delete this Image?")) {
                jQuery(this).removeClass('over-trash');
                var result = assapi('asset','delete', {asset_id: asset_id} );
                jQuery('#'+id).hide();
            }
            jQuery(this).removeClass('over-trash');
            return false;
        }
    });
}


/**
 * Open Asset colorbox
 * This lets users edit a specific Asset
 *
 * @param integer asset_id
 * @param url_target css selector where thumbnail img is to be shown
 * @param val_target css selector where asset_id is to be written
 */
function open_asset_modal(asset_id) {
    console.log('[open_asset_modal] asset_id: '+ asset_id);
    var Asset = '';
    var arrayLength = assman.PageAssets.length;
    for (var i = 0; i < arrayLength; i++) {
        if (assman.PageAssets[i].asset_id == asset_id) {
            Asset = assman.PageAssets[i];
        }
    }
    
    jQuery.colorbox({
        inline:false, 
        width: "850",
        height: function(){
            if (Asset.Asset.is_image) {
                return "90%";
            }
            else {
                return "50%";
            }
        },
        html:function(){
            return assman.tpls.asset_modal(Asset);
        }
    });
}

/**
 * Draw our tab, formatting data using handlebarsjs
 *
 */
function page_init() {
    console.debug('[page_init]');
    inited = 1; // flag it as having been initialized
    assman['tpls'] = {};
    assman.tpls.page_asset = Handlebars.compile(jQuery('#page_asset_tpl').html());
    assman.tpls.category = Handlebars.compile(jQuery('#asset_group_tpl').html());
    assman.tpls.asset_modal = Handlebars.compile(jQuery('#asset_modal_tpl').html());
    
    draw_tab();
    define_dialog_boxes();
    
}


/**
 * Update an asset and its related data with data in the referenced form
 */
function update_asset(form_id) {
    var ModalData = form2js(form_id, '.', false);
    console.log('[update_asset] Modal Data:',ModalData);
    var arrayLength = assman.PageAssets.length;
    for (var i = 0; i < arrayLength; i++) {
        if (assman.PageAssets[i].asset_id == ModalData.asset_id) {
            console.log('Updating Asset: '+ModalData.asset_id);
            
            // This data here is specific to the Asset (not to the PageAsset relation)
            assapi('asset','edit',ModalData.Asset);
            
            for (var key in ModalData.Asset) {
                assman.PageAssets[i].Asset[key] = ModalData.Asset[key];
            }
            delete ModalData.Asset;

            for (var key in ModalData) {
                assman.PageAssets[i][key] = ModalData[key];
            }
            update_page_assets(ModalData);
            break;
        }
    }
    draw_tab();
    jQuery.colorbox.close();
}

// TODO: save this back to the db (separately from the parent page)
function update_page_assets(x) {
    console.log('[update_page_assets]',x);
}

/**
 * Asset Manager API
 *
 * This is the primary function that drives our simple HTML client. This function
 * can dynamically load/replace parts of a page (sorta a "javascript include"), 
 * and it can approximate the effect of clicking on a standard <a> link, but it's 
 * all Ajax-REST based.
 *
 * @param string classname controller class to be requested for a JSON response
 * @param string methodname 
 * @param hash data any additional data to be included in the request to the controller 
 */
function assapi(classname,methodname,data,callback) {
    data = typeof data !== 'undefined' ? data : {}; // default
    
    console.debug('[assapi]',classname,methodname,data);
    
    // We need to set some POST data, otherwise routing will fail.
    data._assman = Math.random()*10000000000000000;
    // Ajax post
    var url = assman.controller_url+'&class='+classname+'&method='+methodname;
    jQuery.post(url, data, function( response ) {
        console.debug(response);
        if(response.status == 'fail') {
            console.log(response.data.errors);
            var msg = 'Error:<br/>';
            for(var fieldname in response.data.errors) {
                msg = msg + response.data.errors[fieldname] + '<br/>';
            }
            return show_error(msg); 
        }
        else if (response.status == 'success') {
            show_success(response.data.msg);
            if (callback != void 0) {
                callback(response);
            }
        }
    },'json')
    .fail(function() {
        console.error('[assapi] post to %s failed', url);
        return show_error('Request failed.');
    });
}

/**
 * Given an array, make all elements in it unique (like PHP function of the same name)
 * @param array
 * @return array
 */
function array_unique(a) {
    var temp = {};
    for (var i = 0; i < a.length; i++)
        temp[a[i]] = true;
    var r = [];
    for (var k in temp)
        r.push(k);
    return r;
}

/**
 * Show a simple error message, then fade it out and clear it so we can reuse the div.
 */
function show_error(msg) {
    jQuery('#assman_msg').html('<div class="danger">'+msg+'</div>')
    .delay(3000).fadeOut(function() {
        jQuery(this).html('');
        jQuery(this).show(); 
    });
}


/**
 * Show a success message, then fade it out and clear it so we can reuse the div.
 */
function show_success(msg) {
    jQuery('#assman_msg').html('<div class="success">'+msg+'</div>')
    .delay(3000).fadeOut(function() {
        jQuery(this).html('');
        jQuery(this).show(); 
    });
}
