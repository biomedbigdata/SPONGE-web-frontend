import { Component, OnInit, ContentChild } from '@angular/core'
import { Controller } from "../../control"
import { Helper } from "../../helper"
import {Router, ActivatedRoute, Params} from '@angular/router'
import { SharedService } from "../../shared.service"
import 'datatables.net'
import { callbackify } from 'util'
import { resolve } from 'dns'
import { Message } from '@angular/compiler/src/i18n/i18n_ast'

declare var Plotly: any;
declare var $;

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['search.component.less']
})
export class SearchComponent implements OnInit {

  pValue_current: number

  constructor(
    private activatedRoute: ActivatedRoute, 
    private router: Router,
    private shared_service: SharedService,
    ) { }

  ngOnInit() {

    const controller = new Controller()
    const helper = new Helper()
    const $this = this
    const pValue = .05
    this.pValue_current = 0.05  //default
    let shared_data: Object = $this.shared_service.getData() ? $this.shared_service.getData() : undefined

    if (shared_data!= undefined) {
      $('#significant_results').prop('checked', shared_data['search_filter']['significant_check'])
    }

    const gene_table_columns = {
      'ENSG Number': 'ensg_number',
      'Gene Symbol': 'gene_symbol',
      'Betweenness': 'betweenness',
      'Eigenvector': 'eigenvector',
      'Node Degree': 'node_degree',
      'Gene ID': 'gene_ID',
      'Network Analysis ID': 'network_analysis_ID'
  }

    var search_key: string[];
    var limit: number = 100;
    var parsed_search_result: any;
    var url_storage;
    let session = null
    let active_cancer_name:string   // name of the currently displayed cancer type in the network
    let ensg4KMP:string
    let count_object
    var preSearchKey
  
    this.activatedRoute.queryParams
      .subscribe(params => {
        // search key should always be defined
        if (Object.keys(params).length > 1) {
          // there are url params, load previous session
          url_storage = helper.load_session_url(params)
        }
        search_key = decodeURIComponent(params.search_key).split(',');
        // only unique
        search_key = [...new Set(search_key)]
      });

    function parse_search_key_table() {
      let search_key = ''
      const ensg_numbers = $('#search_key_information .ensg_number')
      for (const ensg_number of ensg_numbers) {
        search_key += ensg_number.innerText +','
      }
      search_key = search_key.slice(0,-1) // remove last ','
      return  [...new Set(search_key.split(','))] 
    }
    
    $('#options_gene_go').click( () => {
      $this.pValue_current = $('#significant_results').is(':checked') ? pValue : 1

      search_key = parse_search_key_table()
      // remove possible ''
      search_key = search_key.filter(item => item);

      // update url
      update_url()

      if (search_key[0] == '') {
        helper.msg("Please select a search gene", false)
      } else {
        //helper.check_gene_interaction()
        search(limit)
      }    
    })
    
    // set significant result checkbox to true by default
    $('#significant_results').prop('checked', true)

    search(limit)

    $(document).on('click', '#search_key_information .close', function() {
      $(this).closest('tr').remove()
    })

    $(document).on('click', '#show_more', function() {
      if($(this).closest('#show_more').attr('aria-expanded')==='true'){
      $(this).closest('#show_more').text("Show less")
    }else{
      $(this).closest('#show_more').text("Show more")
    }
      
    })


    function draw_cancer_type_accordion() {

      // build html for response_data
      let unique_disease_names = []
      const labels = count_object.map(function(disease) {return disease.run.dataset.disease_name })
      $.each(labels, function(i, el){
          if($.inArray(el, unique_disease_names) === -1) unique_disease_names.push(el);
      });

      for (let disease of unique_disease_names) {
        let disease_trimmed = disease.split(' ').join('').replace('&', 'and')
        let table_id: string = disease_trimmed + "-table"
        // make first letter uppercase
        let disease_label = disease.charAt(0).toUpperCase() + disease.substring(1);
        let accordion_card = "<div class='card'>" +
          "<div class='card-header' id='heading_" + disease_trimmed + "'>" +
          "<h5 class='mb-0'>" +
          "<button class='btn btn-link collapsed' data-toggle='collapse' data-target='#collapse_" + disease_trimmed + "' aria-expanded='false' aria-controls='collapse_" + disease_trimmed + "'>" +
          disease_label +
          "</button>" +
          "</h5>" +
          "</div>" +
          "<div id='collapse_" + disease_trimmed + "' class='collapse' aria-labelledby='headingOne' data-parent='#disease_accordion'>" +
          "<div class='card-body'>" +
          "<div class='card-body-table'></div>" +
          "</div>" +
          "</div>"
        $('#disease_accordion').append(accordion_card)
      }
    }

    function load_interactions(disease, table_id, offset=0, table_complete=false){

      // check if key is ENSG number
      if (search_key[0].startsWith('ENSG')) {
        // API batch limit is 1000 interactions, iterating until we got all batches
        const limit = 1000
        __get_batches_recursive() // try out recursive

        function __get_batches_recursive(offset=0) {

          controller.get_ceRNA_interactions_all({'disease_name':disease, 'ensg_number':search_key, 'limit': limit, 'offset': offset, 'pValue': $this.pValue_current,
            'callback':data => {
              if (data.length == limit) {

                // there are more interactions to load, call function again
                __get_batches_recursive(offset + limit)
                parse_cerna_response_to_table(data, table_id, table_complete=false) 

              } else {
                // just append data to table
                parse_cerna_response_to_table(data, table_id, table_complete=true) 
              }  
            }
          })
        }
      } else if (search_key[0].startsWith('MIMAT')) {
        // key is MIMAT number
        controller.get_miRNA_interactions_all({
          limit: limit,
          mimat_number: search_key,
          disease_name: disease,
          offset: offset,
          callback: (response) => {
            parse_mirna_response(response)
          },
          error: (response) => {
          }
        })
      } else if (search_key[0].startsWith('hsa-')) {
        // key is hsa number
        controller.get_miRNA_interactions_all({
          limit: limit,
          hs_number: search_key,
          disease_name: disease,
          offset: offset,
          callback: (response) => {
            parse_mirna_response(response)
          },
          error: (response) => {
          }
        })
      } else {
        // key is gene symbol
        // API batch limit is 1000 interactions, iterating until we got all batches
        const limit = 1000
        __get_batches_recursive() // try out recursive

        function __get_batches_recursive(offset=0) {

          controller.get_ceRNA_interactions_all({'disease_name':disease, 'gene_symbol':search_key, 'limit': limit, 'offset': offset, 'pValue': $this.pValue_current,
          'callback':data => {

            if (data.length == limit) {

              // there are more interactions to load, call function again
              __get_batches_recursive(offset + limit)
              parse_cerna_response_to_table(data, table_id, table_complete=false) 

            } else {
              // just append data to table
              parse_cerna_response_to_table(data, table_id, table_complete=true) 

            }  
          }
        })
      }
      }
    }

    function update_url() {
      const current_url_search = window.location.search
      let new_url_search = '?search_key=' + search_key

      if (current_url_search != new_url_search) {
        window.history.pushState(null ,"", window.location.origin + window.location.pathname + new_url_search);
      }
    }

    function classify_searchKey(search_key:string){
      if (search_key.startsWith('ENSG')) {
        return "ENSG"
      } else if (search_key.startsWith('MIMAT')) {
        return "MIMAT"
      } else if (search_key.startsWith('hsa-')) {
        return "HSA"
      } else {
        return "GENE"
      }
    }

    function search(limit) {
      // start loading
      $('#loading_spinner').removeClass('hidden')

      // destroy all old datatables
      var tables = $.fn.dataTable.fnTables(true);
      $(tables).each(function () {
          $(this).dataTable().fnDestroy();
      });

      // remove all old filters
      while (true) {
        if($.fn.dataTableExt.afnFiltering.length) {$.fn.dataTableExt.afnFiltering.pop()} 
        else { break }
      }
      
      // clear older search-results
      $('#key_information').empty()
      $('#disease_accordion').empty()
      $('#network-container').empty()
      $('#search_key_information tbody').empty()
      $('#plots').empty()
      $('#pie-chart-header').addClass('hidden')
      
      /* search_key is defined */
      if (search_key != undefined) {
        parsed_search_result = {}
        parsed_search_result['diseases'] = {}
        parsed_search_result['key'] = undefined

        // load pie chart for gene
        let type = classify_searchKey(search_key[0]) == "GENE" ? "gene_symbol" : "ensg_number"
        const minCountSign = $('#significant_results').is(':checked') ? 1 : 0
        controller.gene_count({
          [type]: search_key,
          minCountSign: minCountSign,
          error: (data) => {
            
            if ($('#significant_results').prop('checked')) {
              // no significant interactions found, try again for all interactions
              $('#significant_results').prop('checked', false)
              search(limit)
            } else {
              helper.msg('No interactions were found for you search genes.')
              $('#loading_spinner').addClass('hidden')
            }

          },
          callback: (data) => {
            count_object = data
            let values = data.map(function(node) { return minCountSign ? node.count_sign : node.count_all})
            let labels = data.map(function(node) {
              // first letter uppercase
              return node.run.dataset.disease_name.charAt(0).toUpperCase() + node.run.dataset.disease_name.substring(1);
            })

            var plot_data = [{
              values: values,
              labels: labels,
              type: 'pie',
              textinfo: "value"
            }];

            var layout = {
              autosize: false,
              height: 600,
              width: 1000,
             // title: 'Significant interactions of ' + search_key.join(', ') +' with p-value < 0.05',
              paper_bgcolor: 'white',
              plot_bgcolor: 'rgba(0,0,0,0)',
              
              margin: {
                l: 20,
                r: 50,
                b: 100,
                t: 100,
                pad: 4
              },
              legend:{
                xanchor:"center",
                x: 0.9,
                y: 0.55
              },
              
            };
            let pie_chart_header = $('<h3>').text(`Significant interactions of ${search_key}`)
            if ($('#significant_results').is(':checked')) {
              pie_chart_header.append(' with p-value < 0.05')
            }
            // remove possible old plot
            
            $('#pie_chart_container').empty()
          //  $('#pie_chart_container_background').empty()
            $('#pie-chart-header').empty()
            
            // only show the pie chart if there is a single search key
            if (search_key.length == 1) {
              Plotly.newPlot('pie_chart_container', plot_data, layout);
             
              $('#pie-chart-header').append(pie_chart_header)
              $('#pie-chart-header').removeClass('hidden')
            
              if ($('#pie_chart_container_background').hasClass('hidden')){
                $('#pie_chart_container_background').removeClass('hidden')
              }

              // handle click function on pie chart
              $('#pie_chart_container').on('plotly_click', function(_, data){
                // open accordion tab and start loading
                $( "button:contains('"+data.points[0].label+"')" ).click()
                // scroll down to opened accordion tab
                $([document.documentElement, document.body]).animate({
                  scrollTop: $( "button:contains('"+data.points[0].label+"')" ).offset().top
                }, 1000)
              });
            } else {
              // hide the container
              if (!$('#pie_chart_container_background').hasClass('hidden')){
                $('#pie_chart_container_background').addClass('hidden')
              }
            }

            build_accordion()

            apply_previous_settings()

            // DONE LOADING
            $('#loading_spinner').addClass('hidden'); 
          }
        })
        
        // display gene key information like ENSG-numbers etc.
        for (const key of search_key) {
          controller.search_string(
            {
              searchString: key,
              callback: function(data) {
                // find correct result
                for (const result of data) {
                  if (result['ensg_number'] === key || result['gene_symbol'] === key) {
                    // display information table
                    $('#search_key_information tbody').append(
                      `
                      <tr>
                        <td class="ensg_number">${result['ensg_number']}</td>
                        <td>${result['gene_symbol']}</td>
                        <td><button type="button" class="close" aria-label="Close"><span aria-hidden="true">&times;</span></button></td>
                      </tr>
                      `
                    )
                    break
                  }                  
                }
              }
            }
          )
        }


      }
    }

    function apply_previous_settings() {
      if (shared_data != undefined && 'cancer_type' in shared_data){

        // load cancer type
        const disease:string = shared_data['cancer_type']
        $(`#disease_accordion button:contains("${disease}")`).click()
        // scroll down to opened accordion tab
        $([document.documentElement, document.body]).animate({
          scrollTop: $(`#disease_accordion button:contains("${disease}")`).offset().top
        }, 1000)
        if ('search_filter' in shared_data){
          // load filters 
          const disease_trimmed = disease.toLowerCase().split(' ').join('').replace('&', 'and')
          $(`#pvalue_min_${disease_trimmed}-table`).val(shared_data['search_filter']['p_value_min'])
          $(`#pvalue_max_${disease_trimmed}-table`).val(shared_data['search_filter']['p_value_max'])
          $(`#mscor_min_${disease_trimmed}-table`).val(shared_data['search_filter']['mscor_min'])
          $(`#mscor_max_${disease_trimmed}-table`).val(shared_data['search_filter']['mscor_max'])
          $(`#correlation_min_${disease_trimmed}-table`).val(shared_data['search_filter']['cor_min'])
          $(`#correlation_max_${disease_trimmed}-table`).val(shared_data['search_filter']['cor_max'])
        }

        // reset
        shared_data = undefined
      }
    }

    function parse_mirna_response(response) {
      // get information aboout search key
      let key_information = response[0]['mirna']
      let key_information_sentence = "Results for " + key_information['mir_ID'] + " (" + key_information['hs_nr'] + ")"
      $('#key_information').html(key_information_sentence)
      // parse response
      response.forEach(interaction => {
        let row = {}
        let gene_gene = interaction['interactions_genegene']
        row['Gene1'] = gene_gene['gene1']['ensg_number']
        row['Gene1 Symbol'] = gene_gene['gene1']['gene_symbol']
        row['Gene2'] = gene_gene['gene2']['ensg_number']
        row['Gene2 Symbol'] = gene_gene['gene2']['gene_symbol']
        let disease = gene_gene['run']['dataset']
        if (disease in parsed_search_result['diseases']) {
          parsed_search_result['diseases'][disease].push(row)
        } else {
          parsed_search_result['diseases'][disease] = [row]
        }
      })
      draw_cancer_type_accordion()

      for (let disease in parsed_search_result['diseases']) {
        let disease_trimmed = disease.split(' ').join('').replace('&', 'and')
        let table_id: string = disease_trimmed + "-table"
        let html_table = helper.buildTable(
          parsed_search_result['diseases'][disease],
          table_id,
          Object.keys(parsed_search_result['diseases'][disease][0]),""
        )
        $('#collapse_' + disease_trimmed).find('.card-body-table').html(html_table)

        let table = $("#" + table_id).DataTable({
          orderCellsTop: true,
        })
        helper.colSearch(table_id, table)

        // make rows selectable
        $('#' + table_id + ' tbody').on('click', 'tr', function () {
          $(this).toggleClass('selected');
        })
      }
    }

    function push_interaction_filters(table_id: string) {
      $.fn.dataTable.ext.search.push(
        // filter for mscor
        function (settings, data, dataIndex) {
          if (settings.nTable.id !== table_id) {
            return true;
          }
          var mscor_min = parseFloat($('#mscor_min_' + table_id).val().toString());
          var mscor_max = parseFloat($('#mscor_max_' + table_id).val().toString());
          var mscor = parseFloat(data[6]) || 0; // use data for the mscor column
          if ((isNaN(mscor_min) && isNaN(mscor_max)) ||
            (isNaN(mscor_min) && mscor <= mscor_max) ||
            (mscor_min <= mscor && isNaN(mscor_max)) ||
            (mscor_min <= mscor && mscor <= mscor_max)) {
            return true;
          }
          return false;
        },
        //  filter for pvalue
        function (settings, data, dataIndex) {
          if (settings.nTable.id !== table_id) {
            return true;
          }
          var pvalue_min = parseFloat($('#pvalue_min_' + table_id).val().toString());
          var pvalue_max = parseFloat($('#pvalue_max_' + table_id).val().toString());
          var pvalue = parseFloat(data[7]) || 0; // use data for the pvalue column
          if ((isNaN(pvalue_min) && isNaN(pvalue_max)) ||
            (isNaN(pvalue_min) && pvalue <= pvalue_max) ||
            (pvalue_min <= pvalue && isNaN(pvalue_max)) ||
            (pvalue_min <= pvalue && pvalue <= pvalue_max)) {
            return true;
          }
          return false;
        },
        //  filter for correlation
        function( settings, data, dataIndex ) {
          if ( settings.nTable.id !== table_id ) {
            return true;
          }
          var correlation_min = parseFloat( $('#correlation_min_' + table_id).val().toString());
          var correlation_max = parseFloat( $('#correlation_max_' + table_id).val().toString());
          var correlation = parseFloat( data[5] ) || 0; // use data for the correlation column
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
    }

    function parse_node_data(nodes_table_data:Object, keys:string[]) {
      // parse values from search into correct format
      let gene
      let key
      let nodes_data = {}
      for (let entry in nodes_table_data) {
        if (isNaN(entry as any)) {
          continue
        }
        gene = nodes_table_data[entry]
        nodes_data[entry] = {}
        // map colname to value since we can just export the values from the table
        for (let i=0; i < keys.length; i++) {
          key = keys[i]
          nodes_data[entry][key] = gene[i]
        }
      }

      let nodes = [];
      let node_options = ""   // for node selector
      for (let gene in nodes_data) {
        let id = nodes_data[gene]['ensg_number'];
        let label = nodes_data[gene]['gene_symbol'];
        if (label == '') {
          label = nodes_data[gene]['ensg_number']
        }
        let x = helper.getRandomInt(10);
        let y = helper.getRandomInt(10);
        let size = parseFloat(nodes_data[gene]['p-value']);
        let color = helper.default_node_color;
        nodes.push({id, label, x, y , size, color})

        node_options += "<option data-subtext="+label+">"+id+"</option>"
      }
      // append options to search-dropdown for network
      $('#network_search_node').html(node_options)
      $('#network_search_node').selectpicker()

      // save data for later search
      let ordered_data = [];
      // let ensg_numbers = []
      for (let i=0; i < Object.keys(nodes_data).length; i++) {
        let entry = nodes_data[i]
        // change order of columns alredy in object
        let ordered_entry = {}
        // flatten data object
        for (let x in entry['gene']) {
          entry[x] = entry['gene'][x]
        }
        for (const [key, value] of Object.entries(gene_table_columns)) {
          ordered_entry[key] = entry[value]
        }
        ordered_data.push(ordered_entry)
      }
      $('#node_data').text(JSON.stringify(ordered_data))

      return nodes
    }

    function load_edges(disease:string, nodes:string[], callback?) {
      controller.get_ceRNA_interactions_specific({'disease_name':disease, 'ensg_number':nodes,
        'callback':data => {
          let ordered_data = []
          for (let i=0; i < Object.keys(data).length; i++) {
            let entry = data[i]
            // change order of columns alredy in object
            let ordered_entry = {}
            ordered_entry['Gene 1'] = entry['gene1']['ensg_number']
            ordered_entry['Gene 2'] = entry['gene2']['ensg_number']
            ordered_entry['Correlation'] = entry['correlation']
            ordered_entry['MScor'] = entry['mscor']
            ordered_entry['p-value'] = entry['p_value']
            ordered_entry['ID'] = i
            ordered_data.push(ordered_entry)
          }
          $('#edge_data').text(JSON.stringify(ordered_data))

          let edges = [];
          let edge_options = ""   // for network search selector
          for (let interaction in ordered_data) {
            let id = ordered_data[interaction]['ID'];
            let source = ordered_data[interaction]['Gene 1'];
            let target = ordered_data[interaction]['Gene 2'];
            let size = 100*ordered_data[interaction]['MScor'];
            let color = helper.choose_edge_color(ordered_data[interaction]['p-value']);
            //let type = 'line'//, curve
            edges.push({
              id: id,
              source: source,
              target: target,
              size: size,
              color: color,
            })
            edge_options += "<option data-subtext="+source+","+target+">"+id+"</option>"
          }
          // append options to search-dropdown for network
          $('#network_search_node').append(edge_options)
          return callback(edges)
        },
        error: (response) => {
          helper.msg("Something went wrong while loading the interactions.", true)
        }
      })
    }

    function build_accordion() {
      $('#loading_spinner').removeClass('hidden')
      
      // build table out of parsed result for each disease
      const labels = count_object.map(function(disease) {return disease.run.dataset.disease_name })
      let uniquelabels = [];
      $.each(labels, function(i, el){
          if($.inArray(el, uniquelabels) === -1) uniquelabels.push(el);
      });

      for (let disease of uniquelabels) {
        let disease_trimmed = disease.split(' ').join('').replace('&', 'and')
        let table_id: string = disease_trimmed + "-table"
        // make first letter uppercase
        let disease_label = disease.charAt(0).toUpperCase() + disease.substring(1);
        let accordion_card = "<div class='card'>" +
          "<div class='card-header' id='heading_" + disease_trimmed + "'>" +
          "  <h5 class='mb-0'>" +
          "<button class='btn btn-link collapsed' value='"+table_id+ "' data-toggle='collapse' data-target='#collapse_" + disease_trimmed + "' aria-expanded='false' aria-controls='collapse_" + disease_trimmed + "'>" +
          disease_label +
          "</button>" +
          "</h5>" +
          "</div>" +
          "<div id='collapse_" + disease_trimmed + "' class='collapse' aria-labelledby='headingOne' data-parent='#disease_accordion'>" +
          "<div class='card-body'>" +
          "<div class='button-control-container' id=button_control_"+disease_trimmed+">"+
          "<button disabled='true' class='btn btn-secondary button-margin' type='button' data-toggle='collapse' data-target='#control_" + table_id + "' aria-expanded='false'>" +
          "Filter" +
          "</button>" +
          "<button class='export_nodes btn btn-primary button-margin' style='float: left;' value="+table_id+" disabled='true'>Show as Network</button>"+
          `
          <select class="selectpicker ${(search_key.length<2) ? 'hidden' : ''}" id="interactions_relatve_to_search_keys_${table_id}" disabled>
            <option value="all">All</option>
            <option value="to">Show only interactions <strong>to all</strong> search genes</option>
            <option value="between">Show only interactions <strong>between</strong> search genes</option>
          </select>
          `+
          "<button class='export_nodes_enrichment btn btn-primary button-margin' style='float: left;' value="+table_id+" disabled='true'>Gene Enrichment</button>"+
          "</div>"+
          "<div class='collapse' id='control_" + table_id + "' style='margin-bottom:20px;'>" +
          "<div class='card card-body' style='border-radius:10px; background-color: #004085; background:linear-gradient(45deg, #043056, #004085, #043056); color:white'>" +
          "<div>" +
          "<p>Set filter for MScor</p>" +
          "<span>Minimum: </span><input type='text' style='border-radius:10px; margin-right: 50px;' id='mscor_min_" + table_id + "' name='mscor_min'>&nbsp;" +
          "<span>Maximum: </span><input type='text' style='border-radius:10px; margin-right: 50px;' id='mscor_max_" + table_id + "' name='mscor_max'>" +
          "</div>" +
          "<hr>" +
          "<div>" +
          `<p>Set filter for P-value ${$this.pValue_current == pValue ? '<span class="info" >(Be aware that only signficant entries (<0.05) are displayed)</span>' : '' }</p>` +
          "<span>Minimum: </span><input type='text' style='border-radius:10px; margin-right: 50px;' id='pvalue_min_" + table_id + "' name='pvalue_min'>&nbsp;" +
          "<span>Maximum: </span><input type='text' style='border-radius:10px; margin-right: 50px;' id='pvalue_max_" + table_id + "' name='pvalue_max'>" +
          "</div>" +
          "<hr>" +
          "<div>" +
          "<p>Set filter for Correlation</p>" +
          "<span>Minimum: </span><input type='text' style='border-radius:10px; margin-right: 50px;' id='correlation_min_" + table_id + "' name='correlation_min'>&nbsp;" +
          "<span>Maximum: </span><input type='text' style='border-radius:10px; margin-right: 50px;' id='correlation_max_" + table_id + "' name='correlation_max'>" +
          "</div>" +
          "</div>" +
          "</div>" +
          "<div class='card-body-table'></div>" +
          "</div>" +
          "</div>"
         
        $('#disease_accordion').append(accordion_card)
      }

      $('.selectpicker').selectpicker()

      // manage checkbox d´to just display intersection of gene interactions between all search keys
      $(document).on('change', "select[id^='interactions_relatve_to_search_keys_']", function() {
        // find datatable
        const this_table_id = $(this).attr('id').split('interactions_relatve_to_search_keys_')[1]
        const this_table = $('#'+this_table_id).DataTable()

        if(this.value == 'to') {
          // remove filter
          while (true) {
            if($.fn.dataTableExt.afnFiltering.length) {$.fn.dataTableExt.afnFiltering.pop()} 
            else { break }
          }
          this_table.draw()

          // filter datatable to only get intersection of gene interactions between all search keys
          const unique_keys = this_table.column(0).data().unique()
          const unique_hits = this_table.column(1).data().unique()
          const data = this_table.data()

          // create object to check for each search key per interaction. 
          let empty_hit_checklist = {}
          unique_keys.each(key => empty_hit_checklist[key] = 0)

          // create an object for each interaction partner in the whole table. in the object we store, how many hits it has per search key
          let hit_check_object = {}
          unique_hits.each(hit => hit_check_object[hit] = JSON.parse(JSON.stringify(empty_hit_checklist)))  // deep copy

          for (const index of [...Array(data.length).keys()]) {
            const row = data[index]
            // object {hit: {key: 1}}
            hit_check_object[row[1]][row[0]] = 1
          }

          // get all intersecting objects
          let hits_to_display = []
          for (const [hit, keys] of Object.entries(hit_check_object)) {
            if (Object.values(keys).every(x => x)) {
              hits_to_display.push(hit)
            }
          }

          // display only hits to display, that occur in all search genes
          $.fn.dataTableExt.afnFiltering.push(
            function (oSettings, aData, iDataIndex) {
              
              if (oSettings.nTable.id == this_table_id) {
                return hits_to_display.includes(aData[1]);
              } else {
                return true
              }
            }
          );
          this_table.draw()

        } else if (this.value == 'between') {
          // remove filter
          while (true) {
            if($.fn.dataTableExt.afnFiltering.length) {$.fn.dataTableExt.afnFiltering.pop()} 
            else { break }
          }
          this_table.draw()

          $.fn.dataTableExt.afnFiltering.push(
            function (oSettings, aData, iDataIndex) {
              
              if (oSettings.nTable.id == this_table_id) {
                return search_key.includes(aData[1]);
              } else {
                return true
              }
            }
          );
          this_table.draw()

        } else {
          // remove filter
          while (true) {
            if($.fn.dataTableExt.afnFiltering.length) {$.fn.dataTableExt.afnFiltering.pop()} 
            else { break }
          }
          this_table.draw()
        }
      });

      
      // load table when accordion tab is opened and table has not been loaded already
      $(document).on('click', '.btn.btn-link.collapsed', function() {
        let disease = $(this).text()
        let table_id = $(this).val()

        // check if table already exists OR loading spinner is there, which means we are already loading the table
        if ($('#'+table_id).length || $(this).closest('.card-header').next().find('.card-body-table').html().length) return 

        // start local loading animation, gets removed in the parse function
        $(this).closest('.card-header').next().find('.card-body-table').html('<div class="full-width text-center"><div class="spinner-border spinner"></div></div>')
        
        load_interactions(disease, table_id)
      })

      $('.export_nodes').click(function() {

        /* export data to browse page, where a graph will be shown */ 
        const table_id = $(this).val()
        let table = $('#'+table_id).DataTable()

        // if table is empty, return info msg and stop process
        if (table.rows({ filter : 'applied'}).data().length === 0) {
          helper.msg("The table is empty!", false)
          return
        }

        active_cancer_name = $(this).closest('.card').find('button').first().text()
        let params_genes_keys = ['key', 'ensg_number', 'gene_symbol', 'gene_type', 'chromosome', 'correlation', 'mscor', 'p-value']
  
        // get data
        let nodes = parse_node_data(table.rows({ filter : 'applied'}).data(), params_genes_keys).map(function(node) {return node.id})
        let nodes_marked = parse_node_data(table.rows('.selected', { filter : 'applied'}).data(), params_genes_keys).map(function(node) {return node.id})

        console.log(nodes)
        // append search note to network
        let search_keys_ensg = []

        for (const key of search_key) {
           controller.search_string(
            {
              searchString: key,
              callback: function(response) {
                // get ensg number of search key
                for (let elem of response) {
                  if (elem.gene_symbol == key || elem.ensg_number == key) {
                    search_keys_ensg.push(elem.ensg_number)
                    break
                  }
                }

                if ([...new Set(search_keys_ensg)].length == [...new Set(search_key)].length) {
                  // last key has been added
                  $this.shared_service.setData({
                    'nodes': [...new Set(nodes)],
                    'nodes_marked': [...new Set(nodes_marked)],
                    'cancer_type': active_cancer_name,
                    'p_value': $this.pValue_current,
                    'search_keys': [...new Set(search_keys_ensg)],
                    'interactive_cancer_types': count_object.map(function(disease) {return disease.run.dataset.disease_name }),
                    'search_filter': {
                      mscor_min: $(`#mscor_min_${table_id}`).val(),
                      mscor_max: $(`#mscor_max_${table_id}`).val(),
                      p_value_min: $(`#pvalue_min_${table_id}`).val(),
                      p_value_max: $(`#pvalue_max_${table_id}`).val(),
                      cor_min: $(`#correlation_min_${table_id}`).val(),
                      cor_max: $(`#correlation_max_${table_id}`).val(),
                      significant_check: $this.pValue_current==pValue ? true : false
                    }
                  })
                  // navigate to browse
                  $this.router.navigateByUrl('browse');
                }
                
              }
            }
          )
        }
       
      }) 
     
      /*Gene Enrichment Button*/
      $('.export_nodes_enrichment').click(function() {

        /* export data to browse page, where a graph will be shown */ 
        const table_id = $(this).val()
        let table = $('#'+table_id).DataTable()

        // if table is empty, return info msg and stop process
        if (table.rows({ filter : 'applied'}).data().length === 0) {
          helper.msg("The table is empty!", false)
          return
        }

        active_cancer_name = $(this).closest('.card').find('button').first().text()
        let params_genes_keys = ['key', 'ensg_number', 'gene_symbol', 'gene_type', 'chromosome', 'correlation', 'mscor', 'p-value']
  
        // get data
        let nodes = parse_node_data(table.rows({ filter : 'applied'}).data(), params_genes_keys).map(function(node) {return node.id})
        let nodes_marked = parse_node_data(table.rows('.selected', { filter : 'applied'}).data(), params_genes_keys).map(function(node) {return node.id})

      
        let url;
        let query;
        if(nodes_marked.length != 0){
          query = nodes_marked.join("%0A")
          url= "https://biit.cs.ut.ee/gprofiler/gost?organism=hsapiens&query="+query+"&ordered=false&all_results=false&no_iea=false&combined=false&measure_underrepresentation=false&domain_scope=annotated&significance_threshold_method=g_SCS&user_threshold=0.05&numeric_namespace=ENTREZGENE_ACC&sources=GO:MF,GO:CC,GO:BP,KEGG,TF,REAC,MIRNA,HPA,CORUM,HP,WP&background="

        }else{
          query = nodes.join("%0A")
          url= "https://biit.cs.ut.ee/gprofiler/gost?organism=hsapiens&query="+query+"&ordered=false&all_results=false&no_iea=false&combined=false&measure_underrepresentation=false&domain_scope=annotated&significance_threshold_method=g_SCS&user_threshold=0.05&numeric_namespace=ENTREZGENE_ACC&sources=GO:MF,GO:CC,GO:BP,KEGG,TF,REAC,MIRNA,HPA,CORUM,HP,WP&background="
         
        }

        window.open(url);
       
      }) 

    }

    function parse_cerna_response_to_table(response, table_id, table_complete=false) {

      let table
      let gene_names_for_GO = []
      let disease = response[0]["run"]["dataset"]["disease_name"]
      let disease_trimmed = disease.split(' ').join('').replace('&', 'and')
      parsed_search_result = {}
      parsed_search_result['diseases'] = {}
      parsed_search_result['key'] = undefined

      response.forEach(interaction => {
        
        // parse the information
        let interaction_info = {};
        let gene_to_extract, gene_as_key;
        let disease = interaction['run']['dataset']['disease_name']

        // usually get information for other gene, extract information for key gene only once
        if (search_key.includes(interaction['gene1']['ensg_number']) || search_key.includes(interaction['gene1']['gene_symbol'])) {
          // gene1 is search gene, gene2 is not 
          gene_to_extract = 'gene2'
          gene_as_key = 'gene1'
          // get search gene info if still undefined
          if (parsed_search_result['key'] == undefined) {
            parsed_search_result['key'] = interaction['gene1']
          }
        } else {
          // gene1 is not search gene, gene2 is
          gene_to_extract = 'gene1'
          gene_as_key = 'gene2'
          // get search gene info if still undefined
          if (parsed_search_result['key'] == undefined) {
            parsed_search_result['key'] = interaction['gene2']
          }
        }

        if (!(disease in parsed_search_result['diseases'])) {
          parsed_search_result['diseases'][disease] = []
        }
      

        // KEEP ORDER OF THESE INTERACTIONS as it is how it is displayed in webpage
        interaction_info['Search Gene'] = interaction[gene_as_key]['ensg_number'] // store information which gene was key to get intersection of all keys
        interaction_info['ENSG Number'] = interaction[gene_to_extract]['ensg_number']
        interaction_info['Gene Symbol'] = interaction[gene_to_extract]['gene_symbol'] !== null ? interaction[gene_to_extract]['gene_symbol'] : "-"
        interaction_info['Gene Type'] = interaction[gene_to_extract]['gene_type'] !== null ? interaction[gene_to_extract]['gene_type'].split('_').join(' ') :
        interaction_info['Chromosome'] = interaction[gene_to_extract]['chromosome_name']
        interaction_info['Correlation'] = interaction['correlation']
        interaction_info['MScor'] = interaction['mscor']
        interaction_info['p-value'] = interaction['p_value']
        interaction_info['Hallmarks'] = 'hallmark'
        interaction_info['Pathway'] = 'pathway'
        interaction_info['GeneCard'] = 'genecard'
        interaction_info['Gene Ontology'] = 'go'
        
//        interaction_info['miRNA'] = ''

        parsed_search_result['diseases'][disease].push(interaction_info)
        if(interaction[gene_to_extract]['gene_symbol'] !==null){
        //create list of gene names for Gene Ontology api request
        gene_names_for_GO.push(interaction[gene_to_extract]['gene_symbol'])
        }
      }); // end for each

      /*********** check if table for this disease already exists, if so append, else create new **********/
      if ($('#'+table_id).length) {
        /************* TABLE EXISTS ALREADY, JUST APPEND ROWS ****************/
        let rowse_to_append = []
        parsed_search_result['diseases'][disease].forEach(obj => {
          rowse_to_append.push(Object.values(obj))
        });
        $('#'+table_id).DataTable().rows.add(rowse_to_append).draw()

      } else {
        /************* TABLE DOES NOT EXIST YET, CREATE IT ****************/

        // // Set key-gene information, TODO PROBLEM WITH MULTIPLE SEARCH KEYS
        // let key_information = {
        //   gene: parsed_search_result['key']['ensg_number'],
        //   gene_symbol: parsed_search_result['key']['gene_symbol'],
        //   chromosome: parsed_search_result['key']['chromosome_name']
        // }
        
        // let key_information_sentence = "For gene " + key_information['gene']
        // ensg4KMP=key_information['gene']
        // if (key_information['gene_symbol'] != '') {
        //   key_information_sentence += " (" + key_information['gene_symbol'] + ")"
        // }
        // key_information_sentence += " on chromosome " + key_information['chromosome']
  
        // $('#key_information').html(key_information_sentence)
       
               
      let geneSymbolToGO = []

  
      $this.getGOArray(gene_names_for_GO,controller,geneSymbolToGO).then(() =>{
        
        let html_table = helper.buildTable(
          parsed_search_result['diseases'][disease],
          table_id,
          Object.keys(parsed_search_result['diseases'][disease][0]),
          geneSymbolToGO
        )

        // this line also removes the loading spinner
        $('#collapse_' + disease_trimmed).find('.card-body-table').html(html_table)
   
        // if more data to load, display loading spinner with info message
        if (!table_complete) {
          $('#collapse_' + disease_trimmed).find('.card-body-table').append(`
          <div class="text-center spinner-more">
            <button class="btn btn-primary" type="button" disabled>
              <span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
              Still loading more interactions...
            </button>
          </div>
        `
        )}
  
     
        
      
        push_interaction_filters(table_id)
        
        const disease_first_letter_uppercase = disease.charAt(0).toUpperCase() + disease.substring(1);
        const filename = `SPONGE Interactions ${disease_first_letter_uppercase} ${search_key}`
        // define table settings based on search key length
        let datatable_settings = {
          dom: '<"top"Bf>rt<"bottom"lip>',
          // buttons: [
          //   'copy', 'csv', 'excel', 'pdf', 'print'
          // ],
          buttons: [
            {
                extend: 'copyHtml5',
                title: filename
            },
            {
                extend: 'csvHtml5',
                title: filename
            },
            {
              extend: 'excelHtml5',
              title: filename
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
          orderCellsTop: true,
          drawCallback: function( settings ) {
            var api = this.api();
            // enable last button always if there are more interactions to load
            if (api.data().length % limit == 0) {
              if ($("#" + table_id + '_next').hasClass('disabled')) {
                $("#" + table_id + '_next').removeClass('disabled')
              }
            }
          }
        }        

        let first_col_hidden = false
        if (search_key.length > 1) {
          // grouping by search key
          datatable_settings['order'] =  [[0, 'asc']]
          // datatable_settings['rowGroup'] = {
          //     dataSrc: [0]
          // }
          // datatable_settings['columnDefs'] = [{
          //   targets: [ 0 ],
          //   visible: false
          // }]
        } else {
          first_col_hidden = true;
          // hide "Key" Column if we have just 1 search column
          datatable_settings['columnDefs'] = [
            {
                "targets": [ 0 ],
                "visible": false,
                "searchable": true
            }
          ]
        }

        table = $("#" + table_id).DataTable(datatable_settings)

        helper.colSearch(table_id, table, first_col_hidden)
      }).catch(()=>{console.log("GO array coulndt be loaded")})
        $(`
        #mscor_min_${table_id},
        #mscor_max_${table_id},
        #pvalue_min_${table_id},
        #pvalue_max_${table_id},
        #correlation_min_${table_id},
        #correlation_max_${table_id}
        `).keyup(() => {
          table.draw()
        })
  
        // make rows selectable
        $('#' + table_id + ' tbody').on('click', 'tr', function () {
          $(this).toggleClass('selected');
        })

        // automatically load new entries over API when last+1 page is reached
        $(document).on('click', "#" + table_id + '_next', function () {
          let info = $("#" + table_id).DataTable().page.info()
          // we reached the last page and want to load the next page IF there is still more to load
          if ((info.pages-1 == info.page) && (info.recordsTotal % limit == 0)) {
            load_interactions(disease, table_id, info.recordsTotal)
          }
        });
  
        // mark rows in datatable (and thus later in network) if we restore old session
        if (url_storage) {
          helper.mark_nodes_table(table, url_storage['nodes'])
        }

        // disbale buttons
        $('#'+table_id).closest('.card-body').find('button').prop('disabled', true);
      
      }

      if (table_complete) {

        // remove loading button for more interactions
        $('#collapse_' + disease_trimmed).find('.card-body-table').find('.spinner-more').remove()

        // enable buttons
        $('#'+table_id).closest('.card-body').find('button').prop('disabled', false);

         // enable intersection_search if more than 1 gene key was found
        if ($('#'+table_id).DataTable().column(0).data().unique().length > 1) {
          $('#interactions_relatve_to_search_keys_'+table_id).removeAttr('disabled')
          $('#interactions_relatve_to_search_keys_'+table_id).selectpicker('refresh')
        } else{

          if(search_key.length > 1) {
            // else show info that just one search key was found 
            $('#interactions_relatve_to_search_keys_'+table_id).closest('div.button-control-container').append(
              `
              <div class="alert alert-info alert-dismissible fade show">
                  <strong>N.B.</strong> All the interactions belong to just one search gene.
                  <button type="button" class="close" data-dismiss="alert">&times;</button>
              </div>
              `
              )
          }

          $('#interactions_relatve_to_search_keys_'+table_id).closest('div').remove()
          
        }


/* 
        // start adding miRNAs
        for(let i = 0; i < table.data().length; i++) {
          controller.get_miRNA_by_ceRNA({
            disease_name: disease,
            ensg_number: [table.cell({ row: i, column: 0 }).data(), table.cell({ row: i, column: 1 }).data()],
            between: true,
            callback: (response) => {
              if (response.mirna.mir_ID) {
                table.cell({ row: i, column: 8 }).data(response.mirna.mir_ID)
              }
            },
            error: () => {
              table.cell({ row: i, column: 8 }).data("-")
            }
          })
        }
        table.draw()
*/
      }
    }

    $(function() { 
      function split( val ) {
        return val.split( /,\s*/ );
      } 
      $( ".autocomplete" ).autocomplete({
        source: ( request, response ) => {
          let searchString = split(request.term).pop() // only the last item in list

          // search string has to have min. length of 3
          if (searchString.length > 2) {
            // if search string is engs number, we want to wait with the search until we don't have to load ALL ensg number with sth like "ENSG00..."
            if (searchString.startsWith('ENSG')) {
              if (searchString.length < 12) {
                return
              }
            }
            
            controller.search_string({
              searchString: split(request.term).pop(), // only the last item in list
              callback: (data) => {
                // put all values in a list
                let values=[]
                for (let entry of data) {
                  //  we don't support seach for miRNAs
                  if ('ensg_number' in entry) {
                    const gene_symbol = entry['gene_symbol'] ? `(${entry['gene_symbol']})` : ''
                    values.push(`${entry['ensg_number']} ${gene_symbol}`)
                  }           
                }
                response(values)
              },
              error: () => {
                //console.log(request)
              }
            })
          }
        },
        minLength: 3,
        focus: function() {
          return false;
        },
        select: function( event, ui ) {
          let terms = ui.item.value.split(' ');

          if (terms[1].length && terms[1][0] == '(') {
            terms[1] = terms[1].substring(1, terms[1].length-1);
          }
          // append searched key to table
          $('#search_key_information tbody').append(
            `
            <tr>
              <td class="ensg_number">${terms[0]}</td>
              <td >${terms[1]}</td>
              <td><button type="button" class="close" aria-label="Close"><span aria-hidden="true">&times;</span></button></td>
            </tr>
            `
          )
          // reset search field
          this.value = ''
          return false
        }
      });
    });

    
  }
  
  public getGOArray(gene_names_for_GO, controller, outputArray){
    return new Promise(resolve =>{
    controller.get_GO(
    {
      gene_symbol: gene_names_for_GO,
      callback: function(response) {
        let tmp=[]
        

        var geneSymbol = "first"
        for (let elem of response) {
         
         if(geneSymbol != elem.gene.gene_symbol){
          if(tmp.length>0){
            outputArray[geneSymbol] =tmp
            tmp = []
          }
            geneSymbol = elem.gene.gene_symbol
           
            
            tmp.push(elem.gene_ontology_symbol)
           // geneSymbolToGO[geneSymbol] = elem.gene_ontology_symbol; 
            //hinzuügen der arraylist zu map
         }else{
          tmp.push(elem.gene_ontology_symbol)
         // geneSymbolToGO[geneSymbol].push(elem.gene_ontology_symbol); 
        }
        }

        

     console.log(outputArray)
     return resolve(response)
  
      }
      
    })
  });

  }
}
