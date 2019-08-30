import { Component, OnInit} from '@angular/core';
import { Controller } from "../../control";
//import * as $ from "jquery";
import * as sigma from 'sigma-webpack';
import dragNodes from 'sigma-webpack/plugins/sigma.plugins.dragNodes/sigma.plugins.dragNodes';
//import 'datatables.net';
declare var $;


@Component({
  selector: 'app-browse',
  templateUrl: './browse.component.html',
  styleUrls: ['./browse.component.less']
})
export class BrowseComponent implements OnInit {
  dtOption = {
    "paging":   true,
    "ordering": true,
    "info":     true,
    dom: 'B<"clear">lfrtip',
          buttons: [
            'copyHtml5', 'excelHtml5', 'pdfHtml5', 'csvHtml5', 'print'
          ],
  };
  constructor() {
   }

  ngOnInit() {
    
    const default_node_color = '#920518'
    const default_edge_color = '#0000FF'
    const subgraph_edge_color = '#FF6347'

    const controller = new Controller()

    /* Sigma configurations */
    sigma.classes.graph.addMethod('adjacentEdges', function(id) {
      if (typeof id !== 'string')
        throw 'adjacentEdges: the node id must be a string.';
      var a = this.allNeighborsIndex[id],
          eid,
          target,
          edges = [];
      for(target in a) {
        for(eid in a[target]) {
          edges.push(a[target][eid]);
        }
      }
      return edges;
    });


    /* Datatable configurations */
    $.fn.dataTable.ext.search.push(
      // filter for mscor
      function( settings, data, dataIndex ) {
        if ( settings.nTable.id !== 'interactions-edges-table' ) {
          return true;
        }
        var mscore_min = parseFloat( $('#mscore_min').val());
        var mscore_max = parseFloat( $('#mscore_max').val());
        var mscore = parseFloat( data[4] ) || 0; // use data for the mscore column
        if (( isNaN( mscore_min ) && isNaN( mscore_max ) ) ||
              ( isNaN( mscore_min ) && mscore <= mscore_max ) ||
              ( mscore_min <= mscore && isNaN( mscore_max ) ) ||
              ( mscore_min <= mscore && mscore <= mscore_max ))
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
        var pvalue = parseFloat( data[5] ) || 0; // use data for the pvalue column
        if (( isNaN( pvalue_min ) && isNaN( pvalue_max ) ) ||
          ( isNaN( pvalue_min ) && pvalue <= pvalue_max ) ||
          ( pvalue_min <= pvalue && isNaN( pvalue_max ) ) ||
          ( pvalue_min <= pvalue && pvalue <= pvalue_max ) )
          {
            return true;
          }
        return false;
        }
    );
    
    $('#selected_disease').on('click', function() {
      $('#v-pills-run_information-tab')[0].click();
    });

    $('.selectpicker.diseases').change( () => {
      $('#load_disease').click();
    })

    run_information();

    function getRandomInt(max) {
      return Math.floor(Math.random() * Math.floor(max));
    }

    function buildTable(data, table_name, column_names) {
      var table = document.createElement("table");
      table.id=table_name;
      table.className="table table-striped full-width"
      var thead = document.createElement("thead");
      var tbody = document.createElement("tbody");
      var headRow = document.createElement("tr");
      column_names.forEach(function(el) {
        var th=document.createElement("th");
        th.appendChild(document.createTextNode(el));
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead); 
      data.forEach(function(el) {
        var tr = document.createElement("tr");
        for (var o in el) {  
          var td = document.createElement("td");
          td.appendChild(document.createTextNode(el[o]))
          tr.appendChild(td);
        }
        tbody.appendChild(tr);  
      });
      table.appendChild(tbody);             
      return table;
    }

    function load_nodes(disease_trimmed, callback?) {
      let sort_by = $('.selectpicker.sorting-value option:contains('+$('.selectpicker.sorting-value').val()+')').attr('data-value')
      let cutoff_betweenness = $('#input_cutoff_betweenness').val()
      let cutoff_degree = $('#input_cutoff_degree').val()
      let cutoff_eigenvector = $('#input_cutoff_eigenvector').val()
      let limit = $('#input_limit').val()
      controller.get_ceRNA({'disease_name':disease_trimmed, 'sorting':sort_by, 'limit':limit, 'betweenness':cutoff_betweenness, 'degree': cutoff_degree, 'eigenvector': cutoff_eigenvector,
      'callback': data => {
          let nodes = [];
          for (let gene in data) {
            // flatten data object
            for (let x in data[gene]['gene']) {
              data[gene][x] = data[gene]['gene'][x]
            }
            delete data[gene]['gene']
            delete data[gene]['run']// hide 'run'
            let id = data[gene]['ensg_number'];
            let label = data[gene]['gene_symbol'];
            if (label == '') {
              label = 'unknown'
            }
            let x = getRandomInt(10);
            let y = getRandomInt(10);
            let size = data[gene]['node_degree'];
            let color = default_node_color;
            nodes.push({id, label, x, y , size, color})
          }
        // build datatable
        let column_names = Object.keys(data[0]);
        $("#interactions-nodes-table-container").append(buildTable(data,'interactions-nodes-table', column_names))
        let table = $('#interactions-nodes-table').DataTable( {
          columnDefs: [
            { render: function ( data, type, row ) {
                return data.toString().match(/\d+(\.\d{1,3})?/g)[0];
              },
              targets: [0, 1] }
          ],
          dom: 'Bfrtip',
          buttons: [
              'copy', 'csv', 'excel', 'pdf', 'print'
          ]
        });
        return callback(nodes)
        }
      })
    }

    function load_edges(disease_trimmed, nodes, callback?) {
      controller.get_ceRNA_interactions_specific({'disease_name':disease_trimmed, 'ensg_number':nodes,
        'callback':data => {
          let column_names = Object.keys(data[0]);
          $("#interactions-edges-table-container").append(buildTable(data,'interactions-edges-table', column_names))
          let table = $('#interactions-edges-table').DataTable({
            columnDefs: [
              { render: function ( data, type, row ) {
                      return data.toString().match(/\d+(\.\d{1,3})?/g)[0];
                       },
                  targets: [ 0, 4, 5 ] }
            ],
            dom: 'Bfrtip',
            buttons: [
                'copy', 'csv', 'excel', 'pdf', 'print'
            ]
          });
          
          
          $('#filter_edges :input').keyup( function() {
            table.draw();
        } );
          table.column(6).visible( false ); // hide 'run'
          let edges = [];
          for (let interaction in data) {
            let id = data[interaction]['interactions_genegene_ID'];
            let source = data[interaction]['gene1'];
            let target = data[interaction]['gene2'];
            let size = 100*data['mscore'];
            let color = default_edge_color;
            //let type = line, curve
            edges.push({id, source, target, size, color})
          }
          return callback(edges)
        }
      })
    }

    function run_information() {
      // ALL TS FOR TAB RUN INFORMATION
      // load all disease names from database and insert them into selector 
      let disease_selector = $('.selectpicker.diseases');
      let selected_disease_result = $('#selector_disease_result');
      controller.get_datasets(
        data => {
          let i = 0
          for (let disease in data) {
            disease_selector.append(
              "<option data-value="+data[disease]['download_url']+">"+data[disease]['disease_name']+"</option>"
            )
            i++
          }
          // trigger click on first disease in the beginning
          $('#load_disease').click()
      })

      // takes care of button with link to download page
      // loads specific run information
      $('#load_disease').click(function() {
        $("#interactions-nodes-table-container").html(''); //clear possible other tables
        $("#interactions-edges-table-container").html(''); //clear possible other tables
        $('#network-plot-container').html(''); // clear possible other network

        let selected_disease = disease_selector.val().toString();
        let disease_trimmed:string = selected_disease.split(' ').join('%20');

        let download_url = disease_selector.find(":contains("+selected_disease+")").attr('data-value')
        $('#selector_diseases_link').attr('href', download_url);

        // get specific run information
        controller.get_dataset_information(disease_trimmed, 
          data => {
            selected_disease_result.html(JSON.stringify(data, undefined, 2));
          }
        )

        // load interaction data (edges), load network data (nodes)
        load_nodes(disease_trimmed, nodes => {
          let ensg_numbers = nodes.map(function(node) {return node.id})
          load_edges(disease_trimmed, ensg_numbers, edges => {
            let network = new sigma({
              graph: {
                nodes: nodes,
                edges: edges
              },
                renderer: {
                  container: document.getElementById('network-plot-container'),
                  type: 'canvas'
                },
                settings: {
                  minEdgeSize: 0.1,
                  maxEdgeSize: 2,
                  minNodeSize: 1,
                  maxNodeSize: 8,
                  defaultNodeColor: default_node_color,
                  autoRescale: ['nodePosition', 'nodeSize', 'edgeSize'],
                  animationsTime: 1000,
                  borderSize: 2,
                  outerBorderSize: 3,
                  enableEdgeHovering: true,
                  edgeHoverColor: '#2ecc71',
                  defaultEdgeHoverColor: '#2ecc71',
                  edgeHoverSizeRatio: 1,
                  edgeHoverExtremities: true,
                  scalingMode: 'outside' 
                }
              }
            );

            network.bind('overNode outNode clickNode doubleClickNode rightClickNode', function(e) {
              //console.log(e.type, e.data.node.label, e.data.captor, e.data);
              console.log(e.data.node.label, e.data.node.id)
            });

            network.bind('clickNode',
              function(e)
              {
                var nodeId = e.data.node.id;
                let color_all = false;
                network.graph.adjacentEdges(nodeId).forEach(
                  (ee) => {
                    if (ee.color !== subgraph_edge_color){
                      color_all = true;
                    }
                  }
                )
                if (color_all) {
                  network.graph.adjacentEdges(nodeId).forEach( (ee) => {
                    ee.color = subgraph_edge_color
                  })
                } else {
                  network.graph.adjacentEdges(nodeId).forEach( (ee) => {
                    //ee.color = network.settings.defaultEdgeColor;
                    ee.color = default_edge_color
                  })
                }
                network.refresh();
              });

            // Initialize the dragNodes plugin:
            //var dragListener = sigma.plugins.dragNodes(network, network.renderers[0]);
            // Ask sigma to draw it, it now somehow works without the refresh
            //sigma.refresh()
            //sigma.startForceAtlas2()
            
            //setTimeout(function() {network.killForceAtlas2()}, 10000);
          })
        }) 
      })
      ;
    }
  }
}
