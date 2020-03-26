import { Helper } from '../app/helper';

import * as $ from "jquery";

export class Session {
  /*
  Sessions revolve around networks, hence a session will be created for each network. 
  We do not support multiple networks at the same time, it would slow down the tab too much anyway. Maybe open new tabs if needed in future.
  The main purpose of sessions is to reflect and to be able to reproduce the current state of the network.
  Reconstructing the states of the tables is secondary but also indented.
  */
  network;
  url = null

  constructor(network) {
      this.network = network
      // BROWSE
      $('#load_disease, #export_selected_nodes, #export_selected_edges').click( () => {
        // new search params or new selected nodes / edges
        // TODO maybe timeout until nodes are marked?
        this.update_url()
      })

      // SEARCH
      $('#options_gene_go, .export_nodes').click( () => this.update_url() )  // new search params

      // ALL
      $('#network-plot-container').dblclick( () => this.update_url() )  // marked new edges / node
  }

  helper = new Helper()

  public  getBaseUrl() {
    return document.getElementsByTagName('base')[0].href;
  }
  public update_url() {
    return
    let cancer:string
    // ALL
    cancer = $('#disease_selectpicker').val().toString();

    let selected = this.get_selected()
    let url_params = '?cancer='+encodeURIComponent(cancer)
    if (selected['edges'].length > 0) {
        url_params += '&edges=' + encodeURIComponent(selected['edges'].join())
    }
    if (selected['nodes'].length > 0) {
        url_params += '&nodes=' + encodeURIComponent(selected['nodes'].join())
    }
    /////////////////// BROWSE START
    // sorting value
    if ($('#run-info-select').val()) {
      url_params += '&sorting=' + encodeURIComponent($('#run-info-select').val().toString())
    } 

    // cutoff betweenness
    if ($('#input_cutoff_betweenness').val()) {
      url_params += '&c_bet=' + encodeURIComponent($('#input_cutoff_betweenness').val().toString())
    }

    // cutoff degree
    if ($('#input_cutoff_degree').val()) {
      url_params += '&c_deg=' + encodeURIComponent($('#input_cutoff_degree').val().toString())
    }

    // cutoff eigenvector
    if ($('#input_cutoff_eigenvector').val()) {
      url_params += '&c_eig=' + encodeURIComponent($('#input_cutoff_eigenvector').val().toString())
    }

    // limit
    if ($('#input_limit').val()) {
      url_params += '&limit=' + encodeURIComponent($('#input_limit').val().toString())
    }
    /////////////////// BROWSE END


    /////////////////// SEARCH START
    if ($('#gene_input_limit').val()) {
      url_params += '&limit=' + encodeURIComponent($('#gene_input_limit').val().toString())
    }
    if ($('#gene_search_keys').val()) {
      url_params += '&search_key=' + encodeURIComponent($('#gene_search_keys').val().toString())
    }

    if ($('#network-plot-container').val()) {
      url_params += '&active_cancer=' + encodeURIComponent($('#network-plot-container').val().toString())
    }
    /////////////////// SEARCH END

    let path = window.location.pathname

    window.history.pushState(null, '', path+url_params)
  }

  public get_selected() {
      let edges = []
      let nodes = []
      if (this.network != null) {
        this.network.graph.edges().forEach(
          (ee) => {
            if (ee.color == this.helper.subgraph_edge_color) {
              edges.push(ee['id'])
            }
          })
        this.network.graph.nodes().forEach(
          (node) => {
            if (node.color == this.helper.subgraph_node_color) {
              nodes.push(node['id'])
            }
          }
        )
      }
      return {'edges': edges, 'nodes': nodes}
    }

  public get_displayed() {}
  


}