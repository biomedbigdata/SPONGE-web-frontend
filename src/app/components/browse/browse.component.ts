import { Component, OnInit, ErrorHandler} from '@angular/core';
import { Location } from '@angular/common';
import { Controller } from "../../control";
import { Helper } from "../../helper";
import { Session } from "../../session";
import {Router, ActivatedRoute, Params} from '@angular/router';
import { SharedService } from "../../shared.service"

import sigma from 'sigma';

// wtf you have to declare sigma after importing it
declare const sigma: any;
declare var Plotly: any;
declare var $;

@Component({
  selector: 'app-browse',
  templateUrl: './browse.component.html',
  styleUrls: ['./browse.component.less'],
})
export class BrowseComponent implements OnInit {

  disease_trimmed = ''
  selected_disease = ''

  constructor(
    private activatedRoute: ActivatedRoute,
    private shared_service: SharedService,
    private router: Router,
    private _location: Location
    ) {

  }

  ngOnInit() {

    const controller = new Controller()
    const helper = new Helper()
    const $this = this
    const shared_data: Object = $this.shared_service.getData() ? $this.shared_service.getData() : undefined

    let url_storage;  // save here which nodes and edges to mark while API data is loading

    run_information()

    let node_table
    let edge_table
    let number_nodes_after_request = 0
    const default_node_limit = 25
    $('#input_limit').val(default_node_limit)

    let session = null


    // first things first, define dimensions of network container
    $('#network-plot-container-parent').css('height', $('#network-plot-container').width())
    $(window).on('resize', function(){
      $('#network-plot-container-parent').css('height', $('#network-plot-container').width())
    })

    /* Datatable configurations */
    $.fn.dataTable.ext.search.push(
      // filter for mscor
      function( settings, data, dataIndex ) {
        if ( settings.nTable.id !== 'interactions-edges-table' ) {
          return true;
        }
        var mscor_min = parseFloat( $('#mscor_min').val());
        var mscor_max = parseFloat( $('#mscor_max').val());
        var mscor = parseFloat( data[3] ) || 0; // use data for the mscor column
        if (( isNaN( mscor_min ) && isNaN( mscor_max ) ) ||
              ( isNaN( mscor_min ) && mscor <= mscor_max ) ||
              ( mscor_min <= mscor && isNaN( mscor_max ) ) ||
              ( mscor_min <= mscor && mscor <= mscor_max ))
        {
            return true;
        }
        return false;
      },
      //  filter for pvalue
      function( settings, data, dataIndex ) {
        if ( settings.nTable.id !== 'interactions-edges-table' ) {
          return true;
        }
        var pvalue_min = parseFloat( $('#pvalue_min').val());
        var pvalue_max = parseFloat( $('#pvalue_max').val());
        var pvalue = parseFloat( data[4] ) || 0; // use data for the pvalue column
        if (( isNaN( pvalue_min ) && isNaN( pvalue_max ) ) ||
          ( isNaN( pvalue_min ) && pvalue <= pvalue_max ) ||
          ( pvalue_min <= pvalue && isNaN( pvalue_max ) ) ||
          ( pvalue_min <= pvalue && pvalue <= pvalue_max ) )
          {
            return true;
          }
        return false;
        },
        //  filter for correlation
        function( settings, data, dataIndex ) {
          if ( settings.nTable.id !== 'interactions-edges-table' ) {
            return true;
          }
          var correlation_min = parseFloat( $('#correlation_min').val());
          var correlation_max = parseFloat( $('#correlation_max').val());
          var correlation = parseFloat( data[2] ) || 0; // use data for the correlation column
          if (( isNaN( correlation_min ) && isNaN( correlation_max ) ) ||
            ( isNaN( correlation_min ) && correlation <= correlation_max ) ||
            ( correlation_min <= correlation && isNaN( correlation_max ) ) ||
            ( correlation_min <= correlation && correlation <= correlation_max ) )
            {
              return true;
            }
          return false;
          }
    );
    /* end of configurations */

    $('#selected_disease').on('click', function() {
      $('#v-pills-run_information-tab')[0].click();
    });

    $("#v-pills-interactions-tab").on('click',function(){
      if($('#v-pills-run_information-tab').hasClass('active')){
        $('#v-pills-run_information-tab').removeClass('active')
      }
    })

    $("#v-pills-run_information-tab").on('click',function(){
      if($('#v-pills-interactions-tab').hasClass('active')){
        $('#v-pills-interactions-tab').removeClass('active')
        $('#v-pills-interactions-collapse').attr('aria-expanded', false);
        $('#service').removeClass('show')
       $('#v-pills-interactions-collapse').addClass('collapsed')
      }
    })

    $("#nav-edges-tab").on('click',function(){
      if($(this).hasClass('active')){
        $(this).removeClass('active')}
      if($('#nav-nodes-tab').hasClass('active')){
        $('#nav-nodes-tab').removeClass('active')
      }
      if($('#nav-overview-tab').hasClass('active')){
        $('#nav-overview-tab').removeClass('active')
      }
    })

    $("#nav-nodes-tab").on('click',function(){
      helper.buildTable_GO_HM('interactions-nodes-table')
      if($(this).hasClass('active')){
        $(this).removeClass('active')}
      if($('#nav-edges-tab').hasClass('active')){
        $('#nav-edges-tab').removeClass('active')
      }
      if($('#nav-overview-tab').hasClass('active')){
        $('#nav-overview-tab').removeClass('active')
      }
    })

    $("#nav-overview-tab").on('click',function(){
      if($(this).hasClass('active')){
      $(this).removeClass('active')}
      if($('#nav-edges-tab').hasClass('active')){
        $('#nav-edges-tab').removeClass('active')
      }
      if($('#nav-nodes-tab').hasClass('active')){
        $('#nav-nodes-tab').removeClass('active')
      }
    })

    $('#disease_selectpicker').on('change', function(){
      $('#load_disease').click();
      $('#disease_selectpicker').selectpicker('refresh');
    })

    $('#edge_table_toggle_mirnas').click(function() {
      let column = edge_table.column(6)
      // Toggle the visibility
      $('#interactions-edges-table thead th.sorting').last().toggleClass('hidden')
      column.visible( ! column.visible() );

      // now change button text accordingly
      if (column.visible()) {
        $(this).text('Hide miRNAs')
      } else {
        $(this).text('Show miRNAs')
      }
    })

    $(document).on('click', '#show_more', function() {
      if($(this).closest('#show_more').attr('aria-expanded')==='true'){
      $(this).closest('#show_more').text("Show less")
    }else{
      $(this).closest('#show_more').text("Show more")
    }

    // click on show more should not add class selected (or remove it)
    $(this).closest('tr').toggleClass('selected')
    })

     //load further hallmarks and gos
     $(document).on('click', '.pagination', function() {
      let tmp_id =$(this).closest('.paginate_button .page-item .active').prevObject[0].children[0].id
     let table_id = tmp_id.split('_')[0]
     if(table_id == 'interactions-nodes-table'){
      helper.buildTable_GO_HM('interactions-nodes-table')
     }
    })

    //##################################################################################
    // Here we check if there is information (e.g. from session or from search) to load
    /* In case we restore an old session */
    this.activatedRoute.queryParams.subscribe(params => {
      if (Object.keys(params).length > 0) {
        // there are url params, load previous session
        url_storage = helper.load_session_url(params)
      }
    });

    /* In case we passed data from search to browse (shared service), set cancer type and disable select */
    if (shared_data != undefined) {
      $('#disease_selectpicker').val(shared_data['cancer_type'])
      $('#disease_selectpicker').attr('disabled', true);
      $('#disease_selectpicker').selectpicker('refresh');

      // we also rename the Browse Header
      $("#title-BG h1").text('Search Result')


      // we also want to remove options that are not valid
      $('#disease_selectpicker option').each( function (option) {
        if (!shared_data['interactive_cancer_types'].includes($(this).text().toLowerCase())) {
          $(this).addClass('hidden')
        }
      })

    }
    //##################################################################################

    $('#load_disease').click()

    function load_nodes(disease_trimmed, callback?) {

      // load data if nothing was loaded in search page
      let sort_by: string
      switch ($('#run-info-select').val()) {
        case 'DB Degree': {
          sort_by = 'node_degree'
          break
        }
        case 'Betweenness': {
          sort_by = 'betweenness'
          break
        }
        case 'Eigenvector': {
          sort_by = 'eigenvector'
          break
        }
      }

      const cutoff_betweenness = $('#input_cutoff_betweenness').val()
      const cutoff_eigenvector = $('#input_cutoff_eigenvector').val()

      let limit = $('#input_limit').val()

      if (shared_data == undefined) {
        controller.get_ceRNA({
          disease_name: disease_trimmed,
          sorting: sort_by,
          limit: limit,
          minBetweenness: cutoff_betweenness,
          minEigenvector: cutoff_eigenvector,
          descending: true,
          callback: data => {
            let nodes = parse_node_data(data)
            number_nodes_after_request = nodes.length
            return callback(nodes)
            },
            error: (response) => {
              $('#loading_spinner').addClass('hidden')
              helper.msg("Something went wrong while loading the ceRNAs. Perhaps try a smaller limit.", true)
            }
          }
        )
      } else {
        // kinda tricky construct, we load first the information for the search keys + marked nodes since we want to give them higher priority and then for the rest until limit
        controller.get_ceRNA({
          disease_name: disease_trimmed,
          ensg_number: shared_data['search_keys'].concat(shared_data['nodes_marked']),
          limit: limit,
          callback: data1 => {

            let genes_without_keys_or_marked = shared_data['nodes']
            genes_without_keys_or_marked = genes_without_keys_or_marked.filter( ( el ) => !shared_data['search_keys'].concat(shared_data['nodes_marked']).includes( el ) );
            if (genes_without_keys_or_marked.length > 500) {
              // manually limiting query size since it would cause an error due to url length limitations. nobody is going to be able to display more than 500 genes anyway
              genes_without_keys_or_marked = genes_without_keys_or_marked.slice(0, 500)
            }

            if (genes_without_keys_or_marked.length == 0) {
              // only interactions between search keys
              let nodes = parse_node_data(data1)
              return callback(nodes)
            }

            controller.get_ceRNA({
              disease_name: disease_trimmed,
              ensg_number: genes_without_keys_or_marked,
              limit: limit - (shared_data['search_keys'].length + shared_data['nodes_marked'].length),
              sorting: sort_by,
              minBetweenness: cutoff_betweenness,
              minEigenvector: cutoff_eigenvector,
              descending: true,
              callback: data2 => {
                const all_data = data1.concat(data2)
                let nodes = parse_node_data(all_data)

                if ((genes_without_keys_or_marked.length + shared_data['search_keys'].length + shared_data['nodes_marked'].length) > limit) {
                  // create info message
                  if (!$('#network_messages .alert-nodes').length) {
                    $('#network_messages').append(
                      `
                      <!-- Info Alert -->
                      <div class="alert alert-info alert-dismissible fade show alert-nodes">
                          <strong>N.B.</strong> ${genes_without_keys_or_marked.length + shared_data['search_keys'].length + shared_data['nodes_marked'].length} genes
                          were found in your search, the current displaying limit is ${limit}. If you want to display more, increase the limit and press "Go".
                          <button type="button" class="close" data-dismiss="alert">&times;</button>
                      </div>
                      `)
                  }
                }

                return callback(nodes)
                },
              error: (response) => {
                $('#loading_spinner').addClass('hidden')
                helper.msg("Something went wrong while loading the ceRNAs. Perhaps try a smaller limit.", true)
              }
            })


          }
        })

      }
    }

    const _get_mirna_col_ = function(edge_table, disease_name) {
      let mirna_promises = []
      // load mirnas
      edge_table.rows().every(function ( rowIdx, tableLoop, rowLoop ) {
        const data = this.data();
        if (data[6].length == 0) {
          let p = new Promise(resolve => {
              controller.get_miRNA_by_ceRNA({
              disease_name: disease_name,
              ensg_number: [data[0], data[1]],
              between: true,
              callback: (response) => {

                // there can be duplicates
                let mirnas = {}
                for (let entry of response) {
                  mirnas[entry.mirna.hs_nr + `&nbsp;(${entry.mirna.mir_ID})`] = true
                }

                let mirnas_string = Object.keys(mirnas).join(',<br />')
                edge_table.cell({row: rowIdx, column: 6}).data(mirnas_string)
                return resolve()
              },
              error: () => {
                edge_table.cell({row: rowIdx, column: 6}).data('-')
                return resolve()
              }
            })
          })
          mirna_promises.push(p)
        }

      })
      return mirna_promises
    }


    function load_edges(disease_trimmed, nodes, callback?) {
      // API batch limit is 1000 interactions, iterating until we got all batches
      let limit = 1000

      let p_value
      if (shared_data != undefined) {
        p_value = shared_data['p_value']
      } else {
        p_value = 1
      }

      let all_data = []
      __get_batches_recursive()

      function __get_batches_recursive(offset=0) {

        controller.get_ceRNA_interactions_specific({
          'disease_name':disease_trimmed,
          'ensg_number':nodes,
          'limit': limit,
          'offset': offset,
          'pValue': p_value,
          'pValueDirection': '<',
        'callback':data => {
          all_data = all_data.concat(data)

          // limit !== 1000 checks if limit is set by user
          if (limit === 1000 && data.length == limit) {

            // there are more interactions to load, call function again
            __get_batches_recursive(offset + limit)

          } else {
            // check if we got any interactions
            if (all_data.length == 0) {
              return(callback([]))
            }

            // all batches are loaded, continue processing the all_data
            let ordered_data = []

            let number_edges = Object.keys(all_data).length

            // also removes "run"
            for (let i=0; i < number_edges; i++) {
              let entry = all_data[i]

              if (shared_data != undefined && shared_data['search_keys']) {
                if (!(
                  shared_data['search_keys'].includes(entry['gene1']['ensg_number']) ||
                  shared_data['search_keys'].includes(entry['gene2']['ensg_number'])
                  )) {
                    // interaction has no direct connection to search keys, ignore interaction
                    continue
                }
              }
              // change order of columns alredy in object
              let ordered_entry = {}
              ordered_entry['Gene 1'] = entry['gene1']['ensg_number']
              ordered_entry['Gene 2'] = entry['gene2']['ensg_number']
              ordered_entry['Correlation'] = entry['correlation']
              ordered_entry['MScor'] = entry['mscor']
              ordered_entry['adjusted p-value'] = entry['p_value']
              ordered_entry['ID'] = i
              ordered_entry['miRNAs'] = ``
              ordered_data.push(ordered_entry)
            }

            if (ordered_data.length === 0) {
              $('#network-plot-container').html('<p style="margin-top:150px">No data was found for your search parameters or search genes.</p>')
              $('#loading_spinner').addClass('hidden')
              // $('#disease_selectpicker').attr('disabled',false)
              return
            }

            let column_names = Object.keys(ordered_data[0]);
            $("#interactions-edges-table-container").append(helper.buildTable(ordered_data,'interactions-edges-table', column_names))

            // find index positions from columns to round
            var index_correlation = column_names.indexOf('Correlation');
            var index_mscor = column_names.indexOf('MScor');
            var index_p_value = column_names.indexOf('adjusted p-value');

            // order by p-value or mscor
            let order_by
            let order_by_asc_des
            if ($('#interactions_filter_by').val() == 'adjusted p-value') {
              order_by = 4
              order_by_asc_des = 'asc'
            } else if ($('#interactions_filter_by').val() == 'Mscor') {
              order_by = 3
              order_by_asc_des = 'desc'
            } else if ($('#interactions_filter_by').val() == 'Correlation'){
              order_by = 2
              order_by_asc_des = 'desc'
            }

            const search_key = shared_data != undefined ? shared_data['search_keys'] : ''
            const disease_name = $('#disease_selectpicker').val()
            const filename = `SPONGEdb Interactions ${disease_name} ${search_key}`
            edge_table = $('#interactions-edges-table').DataTable({
              columnDefs: [
                { "width": "20%", "targets": 6 },
                { render: function ( ordered_data, type, row ) {
                        let numb = parseFloat(ordered_data).toFixed(4)
                        if (parseFloat(numb)===0 && numb.length > 1){
                          // numb is sth like 0.00000001212, we set it to 0.0001 bc it is not 0
                          numb = numb.substring(0, numb.length-2) + 1
                        }
                        return numb
                        },
                    targets: [ index_correlation, index_mscor, index_p_value ] },
              ],
              dom: '<"top"Bf>rt<"bottom"lip>',
              buttons: [
                {
                    text: 'Copy',
                    // to make sure that all mirnas have been loaded
                    action: function(e, dt, button, config) {
                      const button_this = this

                      button_this.processing(true); // show indicator on button
                      let mirna_promises = _get_mirna_col_(dt, disease_name)
                      config.filename = filename; // set filename
                      Promise.all(mirna_promises).then(function(values) {
                        $.fn.dataTable.ext.buttons.copyHtml5.action.call(button_this, e, dt, button, config); // call export-action
                        button_this.processing(false); // hide indicator on button
                      });
                    }
                },
                {
                    extend: 'csv',
                    text: 'CSV',
                    // to make sure that all mirnas have been loaded
                    action: function(e, dt, button, config) {
                      const button_this = this

                      button_this.processing(true); // show indicator on button
                      let mirna_promises = _get_mirna_col_(dt,disease_name)
                      config.filename = filename; // set filename
                      Promise.all(mirna_promises).then(function(values) {
                        $.fn.dataTable.ext.buttons.csvHtml5.action.call(button_this, e, dt, button, config); // call export-action
                        button_this.processing(false); // hide indicator on button
                      });
                    }
                },
                {
                  text: 'Excel',
                  // to make sure that all mirnas have been loaded
                  action: function(e, dt, button, config) {
                      const button_this = this

                      button_this.processing(true); // show indicator on button
                      let mirna_promises = _get_mirna_col_(dt,disease_name)
                      config.filename = filename + '.xlsx'; // set filename
                      Promise.all(mirna_promises).then(function(values) {
                        $.fn.dataTable.ext.buttons.excelHtml5.action.call(button_this, e, dt, button, config); // call export-action
                        button_this.processing(false); // hide indicator on button
                      });
                    }
                },
                // { removed due to bad formation of default pdf file
                //   extend: 'pdfHtml5',
                //   title: filename
                // },

              ],

              responsive:true,
              // scrollX:  true,
              lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
              order: [[ order_by, order_by_asc_des ]]
            });
            edge_table.draw()
            $('#interactions-edges-table tbody').on( 'click', 'tr', function () {
              $(this).toggleClass('selected');
            } );
            $('#filter_edges :input').keyup( function() {
              edge_table.draw();
            } );
            // colsearch for table
            helper.colSearch('interactions-edges-table', edge_table)

            // hide mirna column on opening for layout reasons
            $('#edge_table_toggle_mirnas').click()

            const edges_raw = edge_table.data()

            let edges = [];
            for (let i=0; i < edges_raw.length; i++) {
              const interaction = edges_raw[i]
              const id = interaction[5]  // ID
              const source = interaction[0] // Gene 1
              const target = interaction[1] // Gene 2
              const size = Math.abs(20*interaction[3])  // MScor
              const color = helper.choose_edge_color(interaction[4])  // p-value
              edges.push({
                id: id,
                source: source,
                target: target,
                size: size,
                color: color,
              })

            }

            $('#edge_data').text(JSON.stringify(ordered_data))
            return callback(edges)
          }
        },
        error: (response) => {
          //helper.msg("Something went wrong while loading the interactions.", true)
          return(callback([]))
        }
      })
      }
    }

    function run_information() {
      // ALL TS FOR TAB RUN INFORMATION

      // initialize selectpicker
      $('#disease_selectpicker').selectpicker()
      $('#run-info-select').selectpicker()
      $('#interactions_filter_by').selectpicker()

      let disease_selector = $('#disease_selectpicker');
      let selected_disease_result = $('#selector_disease_result')

      // takes care of button with link to download page
      // loads specific run information
      $('#load_disease').click(function() {

        // before we do anything, we check if the input values are valid
        const cutoff_eigenvector = $('#input_cutoff_eigenvector').val()
        // check the eigenvector cutoff since it is different to the others
        if (cutoff_eigenvector < 0 || cutoff_eigenvector > 1) {
          helper.msg("The eigenvector should be between 0 and 1.", true)
          $('#loading_spinner').addClass('hidden')
          return
        }


        // start loading
        // disease_selector.attr('disabled',true)
        $('#loading_spinner').removeClass('hidden')

        if ($("#interactions-nodes-table").length) {

          $('#interactions-nodes-table').DataTable().destroy()
          $('#interactions-eges-table').DataTable().destroy()

          $("#interactions-nodes-table-container").empty(); //clear possible older tables
          $("#interactions-edges-table-container").empty(); //clear possible older tables

          $("#expression_heatmap").empty(); //clear possible older expression map
          $('#network_messages').empty()
          $('#plots').empty()
        }

        this.selected_disease = disease_selector.val().toString();
        this.disease_trimmed = this.selected_disease.split(' ').join('%20');

        let download_url = disease_selector.find(":contains("+this.selected_disease+")").attr('data-value')
        let disease_data_link = $('#selector_diseases_link')
        if (download_url.startsWith('http')) {
          if (disease_data_link.hasClass('hidden')) {
            disease_data_link.removeClass('hidden')
            disease_data_link.find('button').removeClass('disabled')
          }
          disease_data_link.attr('href', download_url);
        } else {
          if (!disease_data_link.hasClass('hidden')) {
            disease_data_link.removeAttr('href')
            disease_data_link.addClass('hidden')
            disease_data_link.find('button').addClass('disabled')
          }
        }

        // get specific run information
        controller.get_dataset_information(this.disease_trimmed,
          data => {
            selected_disease_result.html('')
            data = data[0]

            // header
            let header = data['dataset']['disease_name']
            delete data['dataset']

            let run_table = document.createElement("table")
            let run_name = document.createElement("th")
            run_name.innerHTML = helper.uppercaseFirstLetter(header);

            run_name.setAttribute("style","text-decoration:underline")

            let table= document.createElement("tr")
            table.appendChild(run_name)

            let table_keys= document.createElement("td")
            let table_values= document.createElement("td")

            for (let key in data) {
              let value = data[key]
              if(value == null){
                value = 'Not defined'
              }
              if (key == 'ks') {
                value = value.substring(4, value.length-1)
              }

              var table_entry = document.createElement("tr")
              table_entry.innerHTML = helper.uppercaseFirstLetter( key)
              table_entry.setAttribute("style","margin-right:2px")

              table_keys.appendChild(table_entry)

              var table_entryV = document.createElement("tr")
              table_entryV.innerHTML = value
              table_entryV.setAttribute("style","margin-left:-5px")

              table_values.appendChild(table_entryV)

            }

            table_keys.setAttribute("style","position:relative; top:38px;padding-right:15px")
            table_values.setAttribute("style","position:relative;top: 38px")
            table.setAttribute("style","position:absolute;margin-bottom:20px")
            run_table.appendChild(table)
            run_table.appendChild(table_keys)
            run_table.appendChild(table_values)
            selected_disease_result.append(run_table)
          }
        )

        /* Construct sigma js network plot and expression plot*/
        // load interaction data (edges), load network data (nodes)

        load_nodes(this.disease_trimmed, nodes => {
          let ensg_numbers = nodes.map(function(node) {return node.id})

          // start loading heatmap simultaneously
          // set maximum amount of genes for heatmap, it gets too much wich a ceartain amoung (readability + loading time)
          if (ensg_numbers.length < 51){
            // load expression data
            helper.load_heatmap(this.disease_trimmed, ensg_numbers)
          }

          load_edges(this.disease_trimmed, ensg_numbers, edges => {
            /*
              STEP 1: apply edge filters like p-value and mscor
            */

            // take the maximum p-value into account
            const maximum_p_value = $('#input_maximum_p_value').val()
            if (!isNaN(parseFloat(maximum_p_value)) && maximum_p_value.length > 0) {
              let edges_to_remove = []
              let edges_to_remove_ids = []
              edge_table.rows().every(function(rowIdx, tableLoop, rowLoop) {
                if (maximum_p_value < this.data()[4]) {
                  edges_to_remove.push(this.node())
                  edges_to_remove_ids.push(this.data()[5])
                }
              })
              edges_to_remove.forEach(function(edge) {
                edge_table.row(edge).remove()
              })
              edge_table.draw()

              // remove filtered edges from edges object for network
              let filtered_edges = []
              edges.forEach(function(edge) {
                if (!edges_to_remove_ids.includes(edge.id)) {
                  filtered_edges.push(edge)
                }
              })
              // override edges list
              edges = filtered_edges

            } // end of maximum p value filter

            // take the minimum MScor into account
            const minimum_mscor = $('#input_minimum_mscor').val()
            if (!isNaN(parseFloat(minimum_mscor)) && minimum_mscor.length > 0) {
              let edges_to_remove = []
              let edges_to_remove_ids = []
              edge_table.rows().every(function(rowIdx, tableLoop, rowLoop) {
                if (minimum_mscor > this.data()[3]) {
                  edges_to_remove.push(this.node())
                  edges_to_remove_ids.push(this.data()[5])
                }
              })
              edges_to_remove.forEach(function(edge) {
                edge_table.row(edge).remove()
              })
              edge_table.draw()

              // remove filtered edges from edges object for network
              let filtered_edges = []
              edges.forEach(function(edge) {
                if (!edges_to_remove_ids.includes(edge.id)) {
                  filtered_edges.push(edge)
                }
              })
              // override edges list
              edges = filtered_edges

            } // end of maximum p value filter


            /*
              STEP 2: limit edge number to user limit
            */
            let user_limit = undefined
            // check if limit is set by user and is acutally a number
            if ($('#input_limit_interactions').val() && !isNaN($('#input_limit_interactions').val())) {
              user_limit = $('#input_limit_interactions').val()
            }

            if (!isNaN(parseFloat(user_limit)) && user_limit.length > 0) {
              let edges_to_remove = []
              let edges_to_remove_ids = []
              // edges table is ordered by p-value (ascending)
              let interaction_counter = 0
              edge_table.rows().every(function(rowIdx, tableLoop, rowLoop) {
                interaction_counter++
                if (interaction_counter > user_limit) {
                  edges_to_remove.push(this.node())
                  edges_to_remove_ids.push(this.data()[5])
                }
              })

              edges_to_remove.forEach(function(edge) {
                edge_table.row(edge).remove()
              })
              edge_table.draw()

              // remove filtered edges from edges object for network
              let filtered_edges = []
              edges.forEach(function(edge) {
                if (!edges_to_remove_ids.includes(edge.id)) {
                  filtered_edges.push(edge)
                }
              })

              // override edges list
              edges = filtered_edges
            }

            /*
              STEP 3: Apply node degree filter + sort out unused edges afterwards
            */
            const cutoff_degree = $('#input_cutoff_degree').val()
            if (!isNaN(parseFloat(cutoff_degree)) && cutoff_degree.length > 0) {
              // cutoff is set, filter nodes
              let node_degrees = {}
              let filtered_nodes = []

              for (const node of nodes) {
                node_degrees[node.id] = 0
                for (const edge of edges) {
                  if (edge.source === node.id || edge.target === node.id) {
                    node_degrees[node.id] += 1
                  }
                }
                if (cutoff_degree <= node_degrees[node.id]) {
                  filtered_nodes.push(node)
                }
              }
              // override nodes object
              nodes = filtered_nodes

              // we must remove the node entries from the datatable for consistency
              let nodes_to_remove = [];
              node_table.rows().every(function(rowIdx, tableLoop, rowLoop) {
                if (!(cutoff_degree <= node_degrees[this.data()[0]])){
                  nodes_to_remove.push(this.node())
                }
              })
              nodes_to_remove.forEach(function(node) {
                node_table.row(node).remove()
              })
              node_table.draw()

              // now we must sort out unused edges again
              let filtered_edges = []
              edges.forEach(function(edge) {
                if (cutoff_degree <= node_degrees[edge.target] && cutoff_degree <= node_degrees[edge.source]) {
                  filtered_edges.push(edge)
                }
              })
              // override edges list
              edges = filtered_edges

              // now we must update the edges table
              let edges_to_remove = [];
              edge_table.rows().every(function(rowIdx, tableLoop, rowLoop) {
                if (!(cutoff_degree <= node_degrees[this.data()[0]]) || !(cutoff_degree <= node_degrees[this.data()[1]])){
                  edges_to_remove.push(this.node())
                }
              })
              edges_to_remove.forEach(function(edge) {
                edge_table.row(edge).remove()
              })
              edge_table.draw()

            } // end of degree cutoff filter

            if (Object.keys(edges).length > user_limit) {
              if (!$('#network_messages .alert-edges').length) {
                $('#network_messages').append(
                  `
                  <!-- Info Alert -->
                  <div class="alert alert-info alert-dismissible fade show alert-edges">
                      <strong>N.B.</strong> We found ${edges.length} interactions, the current limit for the network is ${user_limit}. If you want to display more, increase the limit and press "Go".
                      <button type="button" class="close" data-dismiss="alert">&times;</button>
                  </div>
                  `
                )
              }
            } else if (Object.keys(nodes).length === 0) {
              if (!$('#network_messages .alert-edges').length) {
                // remove possible node information since it is not important in this case
                $('#network_messages .alert-nodes').remove()

                $('#network_messages').append(
                  `
                  <!-- Info Alert -->
                  <div class="alert alert-info alert-dismissible fade show alert-edges">
                      <strong>N.B.</strong> We found no nodes fitting the search criteria.
                      Perhaps the search parameters (left hand side) are too strict for your search results, likely adjusting the MScor and adjusted p-value threshold will help.
                      Press "Go" to update your view.
                      <button type="button" class="close" data-dismiss="alert">&times;</button>
                  </div>
                  `
                )
              }
            } else if (number_nodes_after_request == $('#input_limit').val()) {
                if (!$('#network_messages .alert-edges').length) {
                  // remove possible node information since it is not important in this case
                  $('#network_messages .alert-nodes').remove()
                  $('#network_messages').append(
                    `
                    <!-- Info Alert -->
                    <div class="alert alert-info alert-dismissible fade show alert-edges">
                        <strong>N.B.</strong> Due to long loading times, we cannot show all results in the network.
                        If you want to see more, you can increase the threshold parameters (left hand side) and press "Go" again.
                        <button type="button" class="close" data-dismiss="alert">&times;</button>
                    </div>
                    `
                  )
                }
              }
              else {
                // clear old messages
                $('#network_messages .alert-edges').remove()
              }

            let network = null;
            $.when(helper.make_network(this.disease_trimmed, nodes, edges, node_table, edge_table)).done( (network_data) => {
              if (network_data === undefined) {
                // we have no network data bc e.g. we have no nodes due to filters
                network = undefined
                session = undefined
                return
              }

              network = network_data['network']
              session = network_data['session']

              // trigger force atlas 2
              $('#toggle_layout').click()
            })

            $('#export_selected_edges').click(() => {
              // mark all marked edges in the graph
              const selected_edges = edge_table.rows('.selected', { filter : 'applied'}).data()

              // DONT show the rest of the edges that are not in the table
              const filtered_edges_raw = edge_table.rows({ filter : 'applied'}).data()
              let filtered_edges_ids = []
              for (let i = 0; i < filtered_edges_raw.length; i++){
                filtered_edges_ids.push(filtered_edges_raw[i][5])
              }
              helper.limit_edges_to(network, filtered_edges_ids)

              if (selected_edges.length > 0) {
                // only mark edges and grey out rest if any edge is selected
                helper.mark_edges_network(network, selected_edges)
              }

              // go to network
              $('[aria-controls=nav-overview]').click()

              setTimeout(() => {
                $('#restart_camera').click()
                $('#toggle_layout').click()
              }, 200)

            })

            /*Gene Enrichment Button*/
            $('#export_gene_enrichment').click(() =>{
              let selected_nodes = []
              let selected_nodes_data = node_table.rows('.selected', { filter : 'applied'}).data()

              for(let i = 0; i < selected_nodes_data.length; i++) {
                // first row is ensg number
                selected_nodes.push(selected_nodes_data[i][0])
              }

              let nodes_for_ge = []

              for(let i = 0; i < nodes.length; i++) {
                // first row is ensg number
                nodes_for_ge.push(nodes[i]['id'])
              }

              let url;
              let query;
              if(selected_nodes.length != 0){
                query = selected_nodes.join("%0A")
                url= "https://biit.cs.ut.ee/gprofiler/gost?organism=hsapiens&query="+query+"&ordered=false&all_results=false&no_iea=false&combined=false&measure_underrepresentation=false&domain_scope=annotated&significance_threshold_method=g_SCS&user_threshold=0.05&numeric_namespace=ENTREZGENE_ACC&sources=GO:MF,GO:CC,GO:BP,KEGG,TF,REAC,MIRNA,HPA,CORUM,HP,WP&background="

              }else{
                query = nodes_for_ge.join("%0A")
                url= "https://biit.cs.ut.ee/gprofiler/gost?organism=hsapiens&query="+query+"&ordered=false&all_results=false&no_iea=false&combined=false&measure_underrepresentation=false&domain_scope=annotated&significance_threshold_method=g_SCS&user_threshold=0.05&numeric_namespace=ENTREZGENE_ACC&sources=GO:MF,GO:CC,GO:BP,KEGG,TF,REAC,MIRNA,HPA,CORUM,HP,WP&background="

              }

              window.open(url);

            })
            $('#export_selected_nodes').click(() => {
              //helper.clear_subgraphs(network);
              let selected_nodes = []
              let selected_nodes_data = node_table.rows('.selected', { filter : 'applied'}).data()
              for(let i = 0; i < selected_nodes_data.length; i++) {
                // first row is ensg number
                selected_nodes.push(selected_nodes_data[i][0])
              }

              const filtered_nodes_raw = node_table.rows({ filter : 'applied'}).data()
              let filtered_nodes_ids = []
              for (let i = 0; i < filtered_nodes_raw.length; i++){
                filtered_nodes_ids.push(filtered_nodes_raw[i][0])
              }

              helper.limit_nodes_to(network, filtered_nodes_ids)

              helper.mark_nodes_network(network, selected_nodes)

               // load KMP
              helper.load_KMP(selected_nodes,"",selected_disease_result)

              // go to network
              $('[aria-controls=nav-overview]').click()
              setTimeout(() => {
                // network.refresh()
                $('#restart_camera').click()
                $('#toggle_layout').click()
              }, 200)
            })

            //##################################################################################
            // Here we check if there is data to be marked in the network/tables (e.g. from old session of search)
            // check if there is data in the shared_service, meaning we came from search and want to load specific data
            if (shared_data != undefined) {
              console.log(shared_data)
              if (shared_data['nodes_marked'].length) {
                helper.mark_nodes_table(node_table, shared_data['nodes_marked'])

                $('#export_selected_nodes').click()

                helper.load_KMP(shared_data['nodes_marked'],"",this.disease_trimmed)

              }

              // if we come from search, we want to have a back button
              if (!$('#network_messages .back').length) {
                $('#network_messages').append(
                  `
                    <button type="button" class="btn btn-primary back">Back to Search</button>
                  `
                )
                $('#network_messages .back').click(function() {
                  $this._location.back();
                })
              }

            }

            // check if there is data in url storage and if so, mark nodes and edges in the graph and tables
            else if (url_storage && Object.keys(url_storage)) {
              if ('nodes' in url_storage && url_storage['nodes'].length) {
                // mark nodes in nodes table
                helper.mark_nodes_table(node_table, url_storage['nodes'])
                // mark nodes in graph
                $('#export_selected_nodes').click()

                helper.load_KMP(shared_data['nodes_marked'],"",this.disease_trimmed)
              }
              /*
              // TODO:  we currently cant restore edges bc of missing ids
              if ('edges' in url_storage && url_storage['edges'].length) {
                helper.mark_edges_table(edge_table, url_storage['edges'])
                // mark edges in graph
                $('#export_selected_edges').click()
              }*/
              //##################################################################################
            }

            // set maximum amount of genes for heatmap, it gets too much wich a ceartain amoung (readability + loading time)
            // if (ensg_numbers.length < 51){
            //   // load expression data
            //   helper.load_heatmap(this.disease_trimmed, ensg_numbers)
            // }

            // stop loading screen
            disease_selector.attr('disabled', false)
            $('#loading_spinner').addClass('hidden')

            // load mirnas in background
            let mirna_promises = _get_mirna_col_(edge_table, this.disease_trimmed)
            Promise.all(mirna_promises).then(function(values) {
              edge_table.draw()
            });
          })
        })
      })
    }

    function parse_node_data(data) {
      /*
      parses the returned node data from the api
      */

      let ordered_data = [];
      for (let i=0; i < Object.keys(data).length; i++) {
        let entry = data[i]
        // change order of columns alredy in object
        let ordered_entry = {}
        // flatten data object
        for (let x in entry['gene']) {
          entry[x] = entry['gene'][x]
        }
        ordered_entry['ENSG Number'] = entry['ensg_number']
        ordered_entry['Gene Symbol'] = entry['gene_symbol']  == null ? '-' : entry['gene_symbol']
        ordered_entry['Betweenness'] = entry['betweenness']
        ordered_entry['Eigenvector'] = entry['eigenvector']
        ordered_entry['DB Degree'] = entry['node_degree']
        ordered_entry['Hallmarks'] = 'hallmark'
        ordered_entry['Pathway'] = 'pathway'
        ordered_entry['GeneCard'] = 'genecard'
        ordered_entry['Gene Ontology'] = 'go'
        ordered_data.push(ordered_entry)
      }
      let nodes = [];

      for (let gene in ordered_data) {
        let id = ordered_data[gene]['ENSG Number'];
        let label = ordered_data[gene]['Gene Symbol'];
        if (label == '-') {
          label = ordered_data[gene]['ENSG Number']
        }
        let x = ordered_data[gene]['Betweenness']*10 //helper.getRandomInt(10)
        let y = ordered_data[gene]['Eigenvector']*10 //helper.getRandomInt(10)
        let size = (Math.sqrt(ordered_data[gene]['DB Degree'])/10)
        let color = helper.default_node_color;
        nodes.push({id, label, x, y , size, color})
      }

      // build datatable
      let column_names = Object.keys(ordered_data[0]);

      // find index positions from columns to round
      var index_betweenness = column_names.indexOf('Betweenness');
      var index_eigenvector = column_names.indexOf('Eigenvector');
      $("#interactions-nodes-table-container").append(helper.buildTable(ordered_data,'interactions-nodes-table', column_names))
      helper.buildTable_GO_HM('interactions-nodes-table')

      const search_key = shared_data != undefined ? shared_data['search_keys'] : ''
      const disease_name = $('#disease_selectpicker').val()
      const filename = `SPONGEdb Genes ${disease_name} ${search_key}`
      node_table = $('#interactions-nodes-table').DataTable( {
        columnDefs: [
          { render: function ( ordered_data, type, row ) {
              return ordered_data.toString().match(/\d+(\.\d{1,3})?/g)[0];
            },
            targets: [index_betweenness, index_eigenvector] }
        ],
        dom: '<"top"Bf>rt<"bottom"lip>',
        buttons: [
          {
              extend: 'copyHtml5',
              title: filename,
              exportOptions: {
                columns: [0, 1, 2, 3, 4]
            }
          },
          {
              extend: 'csvHtml5',
              title: filename,
              exportOptions: {
                columns: [0, 1, 2, 3, 4]
            }
          },
          {
            extend: 'excelHtml5',
            title: filename,
            exportOptions: {
              columns: [0, 1, 2, 3, 4]
          }
          },
          // { removed due to bad formation of default pdf file
          //   extend: 'pdfHtml5',
          //   title: filename
          // },
          {
            extend: 'print',
            title: filename
          },
        ],
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
        responsive:true,
        // scrollX:  true,
      });
      node_table.draw()

      $('#interactions-nodes-table div').append("<button class='export_nodes_enrichment btn btn-primary button-margin' style='float: left;'>Gene Set Enrichment Analysis<br> (external)</button>")

      // colsearch for table
      helper.colSearch('interactions-nodes-table', node_table)

      $('#interactions-nodes-table tbody').on( 'click', 'tr', function () {
        $(this).toggleClass('selected');
      } );
      // save data for later search
      $('#node_data').text(JSON.stringify(ordered_data))



      /* plot expression data for nodes */
      //helper.expression_heatmap_genes(disease_trimmed, ensg_numbers, 'expression_heatmap')
      return nodes
    }
  }
}
