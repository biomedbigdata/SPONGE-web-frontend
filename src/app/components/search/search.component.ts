import { Component, OnInit } from '@angular/core'
import { Controller } from "../../control"
import { Helper } from "../../helper"
import {Router, ActivatedRoute, Params} from '@angular/router'
import { SharedService } from "../../shared.service"
import 'datatables.net'

declare var Plotly: any;
declare var $;

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.less']
})
export class SearchComponent implements OnInit {

  constructor(
    private activatedRoute: ActivatedRoute, 
    private router: Router,
    private shared_service: SharedService
    ) { }

  ngOnInit() {

    const controller = new Controller()
    const helper = new Helper()
    const $this = this

    var search_key: string;
    var search_key_ensg:string;
    var limit: number = 20;
    var parsed_search_result: any;
    var url_storage;
    let session = null
    let active_cancer_name:string   // name of the currently displayed cancer type in the network
    let ensg4KMP:string
  
    this.activatedRoute.queryParams
      .subscribe(params => {
        // search key should always be defined
        if (Object.keys(params).length > 1) {
          // there are url params, load previous session
          url_storage = helper.load_session_url(params)
        }
        search_key = decodeURIComponent(params.search_key);
      });
    
    $('#options_gene_go').click( () => {
      search_key = $('#gene_search_keys').val()
      if (search_key == '') {
        helper.msg("Please select a search gene", false)
      } else {
        limit = $('#gene_input_limit').val()
        //helper.check_gene_interaction()
        search(limit)
      }    
    })

    $('#options_mirna_go').click( () => {
      search_key = $('#mirna_search_keys').val()
      if (search_key == '') {
        helper.msg("Please select a search gene", false)
      } else {
        limit = $('#mirna_input_limit').val()
        search(limit)
      }
    })
    
    search(limit)

    function draw_cancer_type_accordion(disease_names = null) {
      if (disease_names == null) {
        //controller.check_gene_interaction({})
      }
      // build html for response_data
      for (let disease in disease_names) {
        let disease_trimmed = disease.split(' ').join('').replace('&', 'and')
        let table_id: string = disease_trimmed + "-table"
        let accordion_card = "<div class='card'>" +
          "<div class='card-header' id='heading_" + disease_trimmed + "'>" +
          "<h5 class='mb-0'>" +
          "<button class='btn btn-link collapsed' data-toggle='collapse' data-target='#collapse_" + disease_trimmed + "' aria-expanded='false' aria-controls='collapse_" + disease_trimmed + "'>" +
          disease +
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

    function search(limit) {
      // start loading
      $('#loading_spinner').removeClass('hidden')

      // clear older search-results
      $('#key_information').empty()
      $('#disease_accordion').empty()
      $('#network-container').empty()
      $('#plots').empty()
      /* search_key is defined */
      if (search_key != undefined) {
        parsed_search_result = {}
        parsed_search_result['diseases'] = {}
        parsed_search_result['key'] = undefined

        let disease_name = $('#disease_selectpicker').val()
        if (disease_name == 'All') {
          disease_name = undefined
        } else {
          disease_name = encodeURIComponent(disease_name)
        }

        // check if key is ENSG number
        if (search_key.startsWith('ENSG')) {
          if(!$('#options_mirna').hasClass('hidden')){
            $('#options_mirna').addClass('hidden')
          }
          $('#options_gene').removeClass('hidden')
          $('#gene_search_keys').val(search_key)
          controller.get_ceRNA_interactions_all({
            ensg_number: [search_key],
            limit: limit,
            disease_name: disease_name,
            callback: (response) => {
              parse_cerna_response(response)
            },
            error: (response) => {
              helper.msg("We could not find any matches your ENSG number and your cancer type.", false)
            }
          })
        } else if (search_key.startsWith('MIMAT')) {
          if(!$('#options_gene').hasClass('hidden')){
            $('#options_gene').addClass('hidden')
          }
          // key is MIMAT number
          $('#options_mirna').removeClass('hidden')
          $('#mirna_search_keys').val(search_key)
          controller.get_miRNA_interactions_all({
            limit: limit,
            mimat_number: [search_key],
            disease_name: disease_name,
            callback: (response) => {
              parse_mirna_response(response)
            },
            error: (response) => {
              helper.msg("We could not find any matches your MIMAT number and your cancer type.", false)
            }
          })
        } else if (search_key.startsWith('hsa-')) {
          if(!$('#options_gene').hasClass('hidden')){
            $('#options_gene').addClass('hidden')
          }
          // key is hsa number
          $('#options_mirna').removeClass('hidden')
          $('#mirna_search_keys').val(search_key)
          controller.get_miRNA_interactions_all({
            limit: limit,
            hs_number: [search_key],
            disease_name: disease_name,
            callback: (response) => {
              parse_mirna_response(response)
            },
            error: (response) => {
              helper.msg("We could not find any matches your hsa number and your cancer type.", false)
            }
          })
        } else {
          if(!$('#options_mirna').hasClass('hidden')){
            $('#options_mirna').addClass('hidden')
          }
          // key is gene symbol
          $('#options_gene').removeClass('hidden')
          $('#gene_search_keys').val(search_key)
          controller.get_ceRNA_interactions_all({
            gene_symbol: [search_key],
            limit: limit,
            disease_name: disease_name,
            callback: (response) => {
              parse_cerna_response(response)
            },
            error: (response) => {
              helper.msg("The database does not contain any matches for your gene and your cancer type.", false)
            }
          })
        }
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
      draw_cancer_type_accordion(parsed_search_result['diseases'])

      for (let disease in parsed_search_result['diseases']) {
        let disease_trimmed = disease.split(' ').join('').replace('&', 'and')
        let table_id: string = disease_trimmed + "-table"
        let html_table = helper.buildTable(
          parsed_search_result['diseases'][disease],
          table_id,
          Object.keys(parsed_search_result['diseases'][disease][0])
        )
        $('#collapse_' + disease_trimmed).find('.card-body-table').html(html_table)

        let table = $("#" + table_id).DataTable({
          orderCellsTop: true,
        })
        helper.colSearch(table_id, table)

        // make rows selectable
        $('#' + table_id + ' tbody').on('click', 'tr', function () {
          $(this).toggleClass('selected');
          $(this).css("background-color",helper.select_color)
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
          var mscore_min = parseFloat($('#mscore_min_' + table_id).val().toString());
          var mscore_max = parseFloat($('#mscore_max_' + table_id).val().toString());
          var mscore = parseFloat(data[5]) || 0; // use data for the mscor column
          if ((isNaN(mscore_min) && isNaN(mscore_max)) ||
            (isNaN(mscore_min) && mscore <= mscore_max) ||
            (mscore_min <= mscore && isNaN(mscore_max)) ||
            (mscore_min <= mscore && mscore <= mscore_max)) {
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
          var pvalue = parseFloat(data[6]) || 0; // use data for the pvalue column
          if ((isNaN(pvalue_min) && isNaN(pvalue_max)) ||
            (isNaN(pvalue_min) && pvalue <= pvalue_max) ||
            (pvalue_min <= pvalue && isNaN(pvalue_max)) ||
            (pvalue_min <= pvalue && pvalue <= pvalue_max)) {
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
        // ensg_numbers.push(entry['ensg_number'])
        ordered_entry['ENSG Number'] = entry['ensg_number']
        ordered_entry['Gene Symbol'] = entry['gene_symbol']
        ordered_entry['Betweeness'] = entry['betweeness']
        ordered_entry['Eigenvector'] = entry['eigenvector']
        ordered_entry['Node Degree'] = entry['node_degree']
        ordered_entry['Gene ID'] = entry['gene_ID']
        ordered_entry['Network Analysis ID'] = entry['network_analysis_ID']
        ordered_data.push(ordered_entry)
      }
      $('#node_data').text(JSON.stringify(ordered_data))

      /* plot expression data for nodes */
      //helper.expression_heatmap_genes(disease_trimmed, ensg_numbers, 'expression_heatmap')
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
            console.log(ordered_data[interaction])
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
          console.log(response)
          helper.msg("Something went wrong while loading the interactions.", true)
        }
      })
    }

    function parse_cerna_response(response) {
      $('#loading_spinner').removeClass('hidden')

      response.forEach(interaction => {
        let interaction_info = {};
        let gene_to_extract;
        let disease = interaction['run']['dataset']['disease_name']
        // parse the information
        let correlation = interaction['correlation']
        // usually get information for other gene, extract information for key gene only once
        if (interaction['gene1']['ensg_number'] == search_key || interaction['gene1']['gene_symbol'] == search_key) {
          // gene1 is search gene, gene2 is not 
          gene_to_extract = 'gene2'
          // get search gene info if still undefined
          if (parsed_search_result['key'] == undefined) {
            parsed_search_result['key'] = interaction['gene1']
          }
        } else {
          // gene1 is not search gene, gene2 is
          gene_to_extract = 'gene1'
          // get search gene info if still undefined
          if (parsed_search_result['key'] == undefined) {
            parsed_search_result['key'] = interaction['gene2']
          }
        }

        if (!(disease in parsed_search_result['diseases'])) {
          parsed_search_result['diseases'][disease] = []
        }

        interaction_info['ENSG Number'] = interaction[gene_to_extract]['ensg_number']
        interaction_info['Gene Symbol'] = interaction[gene_to_extract]['gene_symbol']
        interaction_info['Gene Type'] = interaction[gene_to_extract]['gene_type']
        interaction_info['Chromosome'] = interaction[gene_to_extract]['chromosome_name']
        interaction_info['Correlation'] = interaction['correlation']
        //interaction_info['gene'] = interaction[gene_to_extract]['gene_ID']
        interaction_info['MScor'] = interaction['mscor']
        interaction_info['p-value'] = interaction['p_value']

        parsed_search_result['diseases'][disease].push(interaction_info)

      }); // end for each

      // Set key-gene information
      let key_information = {
        gene: parsed_search_result['key']['ensg_number'],
        gene_symbol: parsed_search_result['key']['gene_symbol'],
        chromosome: parsed_search_result['key']['chromosome_name']
      }
      let key_information_sentence = "For gene " + key_information['gene']
      ensg4KMP=key_information['gene']
      if (key_information['gene_symbol'] != '') {
        key_information_sentence += " (" + key_information['gene_symbol'] + ")"
      }
      key_information_sentence += " on chromosome " + key_information['chromosome']

      $('#key_information').html(key_information_sentence)
      // build table out of parsed result for each disease
      for (let disease in parsed_search_result['diseases']) {
        let disease_trimmed = disease.split(' ').join('').replace('&', 'and')
        let table_id: string = disease_trimmed + "-table"
        let accordion_card = "<div class='card'>" +
          "<div class='card-header' id='heading_" + disease_trimmed + "'>" +
          "  <h5 class='mb-0'>" +
          "<button class='btn btn-link collapsed' data-toggle='collapse' data-target='#collapse_" + disease_trimmed + "' aria-expanded='false' aria-controls='collapse_" + disease_trimmed + "'>" +
          disease +
          "</button>" +
          "</h5>" +
          "</div>" +
          "<div id='collapse_" + disease_trimmed + "' class='collapse' aria-labelledby='headingOne' data-parent='#disease_accordion'>" +
          "<div class='card-body'>" +
          "<div id=button_control_"+disease_trimmed+">"+
          "<button class='btn btn-secondary button-margin' type='button' data-toggle='collapse' data-target='#control_" + table_id + "' aria-expanded='false'>" +
          "Options" +
          "</button>" +
          "<button class='export_nodes btn btn-primary button-margin' value="+table_id+">Show as Network</button>"+
          "</div>"+
          "<div class='collapse' id='control_" + table_id + "' style='margin-bottom:20px;'>" +
          "<div class='card card-body' style='border-radius:10px; background-color: #004085; background:linear-gradient(45deg, #043056, #004085, #043056); color:white'>" +
          "<div>" +
          "<p>Set filter for mscor</p>" +
          "<span>Minimum: </span><input type='text' style='border-radius:10px; margin-right: 50px;' id='mscore_min_" + table_id + "' name='mscore_min'>&nbsp;" +
          "<span>Maximum: </span><input type='text' style='border-radius:10px; margin-right: 50px;' id='mscore_max_" + table_id + "' name='mscore_max'>" +
          "</div>" +
          "<hr>" +
          "<div>" +
          "<p>Set filter for P-value</p>" +
          "<span>Minimum: </span><input type='text' style='border-radius:10px; margin-right: 50px;' id='pvalue_min_" + table_id + "' name='pvalue_min'>&nbsp;" +
          "<span>Maximum: </span><input type='text' style='border-radius:10px; margin-right: 50px;' id='pvalue_max_" + table_id + "' name='pvalue_max'>" +
          "</div>" +
          "</div>" +
          "</div>" +
          "<div class='card-body-table'></div>" +
          "</div>" +
          "</div>"
         
        $('#disease_accordion').append(accordion_card)

        let html_table = helper.buildTable(
          parsed_search_result['diseases'][disease],
          table_id,
          Object.keys(parsed_search_result['diseases'][disease][0])
        )
        $('#collapse_' + disease_trimmed).find('.card-body-table').html(html_table)

        push_interaction_filters(table_id)
        var table = $("#" + table_id).DataTable({
          orderCellsTop: true,
        })
        helper.colSearch(table_id, table)

        $('#mscore_min_' + table_id + ', #mscore_max_' + table_id + ', #pvalue_min_' + table_id + ', #pvalue_max_' + table_id).keyup(() => {
          table.draw()
        })
        // make rows selectable
        $('#' + table_id + ' tbody').on('click', 'tr', function () {
          $(this).toggleClass('selected');
          $(this).css("background-color",helper.select_color)
        })

        // BUTTON: load expression information for gene in this disease
        let config = {
          disease_name: disease.split(' ').join('%20'),
          callback: (response) => {
            // open raw expression data in new tab
            let json = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(response));
            let buttons = $("#button_control_"+disease_trimmed)
            buttons.append($('<a href="data:' + json + '" download="expression_'+disease_trimmed+'.json" class="btn btn-secondary button-margin">Raw Expression Data</a>'))
          },
          error: (response) => {
            console.log("here")
          }
        };
        if (search_key.startsWith('ENSG')) {
          config['ensg_number'] = [key_information['gene']]
        
        } else {
          config['gene_symbol'] = [key_information['gene_symbol']]
        }
        controller.get_expression_ceRNA(config)

        // mark rows in datatable (and thus later in network) if we restore old session
        if (url_storage) {
          helper.mark_nodes_table(table, url_storage['nodes'])
        }

        $(".export_nodes").last().click( function() {
          /* export data to browse page, where a graph will be shown */ 

          let table = $('#'+$(this).val()).DataTable()
          active_cancer_name = $(this).closest('.card').find('button').first().text()
          let params_genes_keys = ['ensg_number', 'gene_symbol', 'gene_type', 'chromosome', 'correlation', 'mscor', 'p-value']

          // get data
          let nodes = parse_node_data(table.rows().data(), params_genes_keys)
          // let nodes_to_mark = parse_node_data(table.rows('.selected', { filter : 'applied'}).data(), params_genes_keys)
          let ensg_numbers = nodes.map(function(node) {return node.id})
          // let ensg_numbers_to_mark = nodes_to_mark.map(function(node) {return node.id})

          $this.shared_service.setData({
            'nodes': nodes,
            'edges': ensg_numbers,
            'cancer_type': active_cancer_name
          })

          // navigate to browse
          $this.router.navigateByUrl('browse');

          /*
          // start loading spinner
          $('#loading_spinner').removeClass('hidden')

          let table = $('#'+$(this).val()).DataTable()

          // set the active cancer variable
          active_cancer_name = $(this).closest('.card').find('button').first().text()
         
          let params_genes_keys = ['ensg_number', 'gene_symbol', 'gene_type', 'chromosome', 'correlation', 'mscor', 'p-value']
          
          let nodes = parse_node_data(table.rows().data(), params_genes_keys)
          let nodes_to_mark = parse_node_data(table.rows('.selected', { filter : 'applied'}).data(), params_genes_keys)

          let ensg_numbers = nodes.map(function(node) {return node.id})
          let ensg_numbers_to_mark = nodes_to_mark.map(function(node) {return node.id})
          
          helper.mark_nodes_table(table, ensg_numbers_to_mark)
          load_edges(encodeURI(disease), ensg_numbers, edges => {
          
            let network_data = helper.make_network(disease_trimmed, nodes, edges)
            let network = network_data['network']
            session = network_data['session']

            setTimeout(() => {
              // network.refresh()
              $('#restart_camera').click()
              helper.mark_nodes_network(network, ensg_numbers_to_mark)
              if (url_storage) helper.mark_edges_network(network, url_storage['edges'], true)
              network.refresh()
              
              // store active cancer name
              $('#network-plot-container').val(active_cancer_name)
            
              session.update_url()
              helper.load_KMP(ensg_numbers_to_mark,"", "") 
            }, 500)

            // load expression data
            //load_heatmap(this.disease_trimmed, ensg_numbers)
            
            // finish loading process
            if ($('#network').hasClass('hidden')) {
              $('#network').removeClass('hidden')
            
              // clear url storage so no more information is loaded 
              url_storage = undefined
              
            }

            // remove loading spinner
            console.log("end loading")
            $('#loading_spinner').addClass('hidden');
            
          })
*/
        })

        $('#loading_spinner').addClass('hidden');  

        // load network immediately if we restore old session
        if (url_storage && url_storage['active_cancer'] == disease) {
          $('.export_nodes').last().click()
          //helper.load_KMP(url_storage['nodes']) 
          
          $('#plots').removeClass('hidden')
        }
      }
    }

    $(function() {  
      $( ".autocomplete" ).autocomplete({
        source: ( request, response ) => {
          controller.search_string({
            searchString: request.term,
            callback: (data) => {
              // put all values in a list
              let values = []
              for (let entry in data) {
                values.push(Object.values(data[entry])[1]+" ("+Object.values(data[entry])[0]+")")
              }
              response(values)
            },
            error: () => {
              console.log(request)
            }
          })
        },
        minLength: 3,
        search: function() {
          $( this ).addClass( "loading" );
        },
        response: function() {
          $( this ).removeClass( "loading" );
        }
      });
    });
   
    
  }

  
  
}
