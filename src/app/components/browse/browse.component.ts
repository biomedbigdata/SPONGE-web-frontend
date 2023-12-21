import { Component, OnInit, ErrorHandler } from '@angular/core';
import { Location } from '@angular/common';
import { Controller } from '../../control';
import { Helper } from '../../helper';
import { Session } from '../../session';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { SharedService } from '../../shared.service';
import axios from 'axios';

import sigma from 'sigma';
import { enableDebugTools } from '@angular/platform-browser';

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
  constructor(
    private activatedRoute: ActivatedRoute,
    private sharedService: SharedService,
    private router: Router,
    private location: Location
  ) {}
  private automaticInteractionValueChange = false;
  private secondIterationAutomaticChange = false;
  private diseaseTrimmed = '';
  private selectedDisease = '';
  private readonly controller = new Controller();
  private readonly helper = new Helper();
  private numberNodesAfterRequest;
  private edgeTable;
  private nodeTable;
  private static async loadSubtypes(
    controller: Controller,
    diseaseName: string,
    isSubtypeSelection = false
  ): Promise<void> {
    if (isSubtypeSelection) {
      return;
    }
    let subtypeName;
    let datasets = await controller.get_datasets(diseaseName);

    if (datasets.length !== 0) {
      const datasetInfo = datasets[0];
      subtypeName = datasetInfo.disease_name_abbreviation;
    }

    if (subtypeName === null) {
      subtypeName = diseaseName;
    }
    datasets = await controller.get_datasets(subtypeName);

    const subtypeSelector = $('#disease_subtype');
    const subtypeSelectorElement = subtypeSelector[0] as HTMLSelectElement;
    // Remove every subtype of previously selected elements.
    while (subtypeSelectorElement.options.length > 1) {
      subtypeSelectorElement.remove(1);
    }
    if (datasets.length > 1) {
      for (const dataset of datasets) {
        if (dataset.disease_type === 'cancer') {
          continue;
        }
        diseaseName = dataset.disease_name;
        const element = document.createElement('option');
        element.value = diseaseName;
        diseaseName = diseaseName.replace(subtypeName + ' - ', '');
        element.text = diseaseName;
        subtypeSelectorElement.add(element);
      }
      $('#subtype_selector').removeClass('hidden');
    } else {
      $('#subtype_selector').addClass('hidden');
    }
    subtypeSelector.selectpicker('refresh');
  }

  private static isDefault() {
    return (
      $('#input_maximum_p_value').val() === '0.01' &&
      $('#input_minimum_mscor').val() === '0.1' &&
      $('#input_limit_interactions').val() === '100'
    );
  }

  private static selectDefaults() {
    $('#input_maximum_p_value').val(0.01);
    $('#input_minimum_mscor').val(0.1);
  }

  private activateClickListeners() {
    $('#selected_disease').on('click', () => {
      $('#v-pills-run_information-tab')[0].click();
    });

    $('#v-pills-interactions-tab').on('click', () => {
      if ($('#v-pills-run_information-tab').hasClass('active')) {
        $('#v-pills-run_information-tab').removeClass('active');
      }
    });

    $('#v-pills-run_information-tab').on('click', () => {
      if ($('#v-pills-interactions-tab').hasClass('active')) {
        $('#v-pills-interactions-tab').removeClass('active');
        $('#v-pills-interactions-collapse').attr('aria-expanded', false);
        $('#service').removeClass('show');
        $('#v-pills-interactions-collapse').addClass('collapsed');
      }
    });

    $('#nav-edges-tab').on('click', () => {
      if ($(this).hasClass('active')) {
        $(this).removeClass('active');
      }
      if ($('#nav-nodes-tab').hasClass('active')) {
        $('#nav-nodes-tab').removeClass('active');
      }
      if ($('#nav-overview-tab').hasClass('active')) {
        $('#nav-overview-tab').removeClass('active');
      }
      if ($('#genome-browser-tab').hasClass('active')) {
        $('#genome-browser-tab').removeClass('active');
      }
    });

    $('#nav-nodes-tab').on('click', () => {
      this.helper.buildTable_GO_HM('interactions-nodes-table');
      if ($(this).hasClass('active')) {
        $(this).removeClass('active');
      }
      if ($('#nav-edges-tab').hasClass('active')) {
        $('#nav-edges-tab').removeClass('active');
      }
      if ($('#nav-overview-tab').hasClass('active')) {
        $('#nav-overview-tab').removeClass('active');
      }
      if ($('#genome-browser-tab').hasClass('active')) {
        $('#genome-browser-tab').removeClass('active');
      }
    });

    $('#nav-overview-tab').on('click', () => {
      if ($(this).hasClass('active')) {
        $(this).removeClass('active');
      }
      if ($('#nav-edges-tab').hasClass('active')) {
        $('#nav-edges-tab').removeClass('active');
      }
      if ($('#nav-nodes-tab').hasClass('active')) {
        $('#nav-nodes-tab').removeClass('active');
      }
      if ($('#genome-browser-tab').hasClass('active')) {
        $('#genome-browser-tab').removeClass('active');
      }
    });

    $('#genome-browser-tab').on('click', () => {
      if ($(this).hasClass('active')) {
        $(this).removeClass('active');
      }
      if ($('#nav-edges-tab').hasClass('active')) {
        $('#nav-edges-tab').removeClass('active');
      }
      if ($('#nav-nodes-tab').hasClass('active')) {
        $('#nav-nodes-tab').removeClass('active');
      }
      if ($('#nav-overview-tab').hasClass('active')) {
        $('#nav-overview-tab').removeClass('active');
      }
    });

    // g-browser testing
    //hsa-miR-99b-5p.bed real file
    const iframe = document.querySelector('iframe');
    const defaultMessage = {
      type: 'file',
      data: { name: 'selected',
        url: 'https://exbio.wzw.tum.de/sponge-bed/miRNA_BED/hsa-miR-10b-5p.bed',
        type: 'annotation',
        format: 'bed',
        displayMode: 'EXPANDED',
      }
    };
    // iframe.addEventListener('load', () => {
    //   iframe.contentWindow.postMessage(default_message, '*');
    // });

    iframe.onload = () => {
      console.log('The iframe is loaded');
      // todo
      // on Load of iframe, load the default miRNA
      setTimeout(() => iframe.contentWindow.postMessage(update_g_browse, '*'), 3000);
    };
    iframe.onerror = () => {
      console.log('iframe didnt load');
    };

    //var gene_list = ["ENSG00000203995", "ENSG00000155893", "ENSG00000152076", "ENSG00000172379", "ENSG00000165194", "ENSG00000165238", "ENSG00000130413", "ENSG00000130413", "ENSG00000251364", "ENSG00000261409"]
    var gene_list = ["ENSG00000203995", "ENSG00000155893", "ENSG00000152076"]
    //var miRNA_list = ["hsa-miR-10b-5p", "hsa-miR-372-3p", "hsa-miR-26b-5p", "hsa-miR-24-3p", "hsa-miR-27a-3p", "hsa-miR-338-3p", "hsa-miR-30e-5p", "hsa-miR-29a-3p", "hsa-let-7g-5p", "hsa-miR-19a-3p", "hsa-miR-520b-3p", "hsa-miR-193a-3p", "hsa-miR-195-5p", "hsa-miR-454-3p", "hsa-miR-216a-5p", "hsa-miR-139-5p", "hsa-miR-23a-3p", "hsa-let-7b-5p", "hsa-miR-365a-3p", "hsa-miR-96-5p", "hsa-miR-203a-3p", "hsa-let-7f-5p", "hsa-miR-205-5p", "hsa-miR-15a-5p", "hsa-let-7d-5p", "hsa-miR-107", "hsa-miR-92a-3p", "hsa-miR-130a-3p", "hsa-miR-18a-5p", "hsa-miR-103a-3p", "hsa-miR-590-5p", "hsa-miR-424-5p", "hsa-miR-130a-5p", "hsa-miR-212-3p", "hsa-miR-150-5p", "hsa-miR-193b-3p", "hsa-miR-34a-5p", "hsa-let-7a-5p", "hsa-miR-520c-3p", "hsa-miR-148b-3p", "hsa-miR-19b-3p", "hsa-miR-181b-5p", "hsa-let-7c-5p", "hsa-miR-31-5p", "hsa-miR-32-5p", "hsa-miR-7-5p", "hsa-miR-181a-5p", "hsa-miR-33b-5p", "hsa-miR-503-5p"]
    var miRNA_list = ["hsa-miR-10b-5p", "hsa-miR-372-3p", "hsa-miR-26b-5p"]
    //TODO POST request with input data
    var front_data = {gene_list, miRNA_list}
    //front_data = JSON.stringify(front_data)
    //where to send the post
    //const apiUrl = 'http://localhost:8080/process'
    const apiUrl = 'http://localhost:8080/process'
    let incoming_files
    //send to server
    axios.post(apiUrl, front_data)
      .then((response) => {
        console.log('Request successful', response.data);
        incoming_files = response.data
      })
      .catch((error) => {
        console.error('Request failed', error);
      });

    //return JSON object as BLOB
    let blob
    if (incoming_files) {
      console.log("recieved incoming files")
      let json_reduced_files = JSON.stringify(incoming_files);
      console.log("print incoming files")
      //console.log(incoming_files)
      console.log("printed incoming files")
      blob = new Blob([json_reduced_files], { type: 'application/json' });
      // Do something with the blob, such as downloading or using it in your application.
    } else {
          console.log("Waiting for files")
    }

    //same as message, replace url with blob
    const update_g_browse = {
      type: 'file',
      data: { name: 'selected',
        url: blob,
        type: 'annotation',
        format: 'bed',
        displayMode: 'EXPANDED',
      }
    };

    $('#disease_selectpicker').on('change', () => {
      $('#disease_subtype')[0].selectedIndex = 0;
      if (this.automaticInteractionValueChange) {
        BrowseComponent.selectDefaults();
        this.automaticInteractionValueChange = false;
      }
      $('#load_disease').click();
      $('#disease_selectpicker').selectpicker('refresh');
    });
    $('#disease_subtype').on('change', () => {
      if (this.automaticInteractionValueChange) {
        BrowseComponent.selectDefaults();
        this.automaticInteractionValueChange = false;
      }
      $('#load_disease').click();
      $('#disease_subtype').selectpicker('refresh');
    });

    $('#edge_table_toggle_mirnas').click(() => {
      const column = this.edgeTable.column(6);
      // Toggle the visibility
      $('#interactions-edges-table thead th.sorting')
        .last()
        .toggleClass('hidden');
      column.visible(!column.visible());

      // now change button text accordingly
      if (column.visible()) {
        $(this).text('Hide miRNAs');
      } else {
        $(this).text('Show miRNAs');
      }
    });

    $(document).on('click', '#show_more', () => {
      if ($(this).closest('#show_more').attr('aria-expanded') === 'true') {
        $(this).closest('#show_more').text('Show less');
      } else {
        $(this).closest('#show_more').text('Show more');
      }

      // click on show more should not add class selected (or remove it)
      $(this).closest('tr').toggleClass('selected');
    });

    // load further hallmarks and gos
    $(document).on('click', '.pagination', () => {
      const tmpId = $(this).closest('.paginate_button .page-item .active')
        .prevObject[0].children[0].id;
      const tableId = tmpId.split('_')[0];
      if (tableId === 'interactions-nodes-table') {
        this.helper.buildTable_GO_HM('interactions-nodes-table');
      }
    });
  }
  private async load_nodes(sharedData, diseaseTrimmed) {
    // load data if nothing was loaded in search page
    let sortBy: string;
    switch ($('#run-info-select').val()) {
      case 'DB Degree': {
        sortBy = 'node_degree';
        break;
      }
      case 'Betweenness': {
        sortBy = 'betweenness';
        break;
      }
      case 'Eigenvector': {
        sortBy = 'eigenvector';
        break;
      }
    }

    const cutoffBetweenness = $('#input_cutoff_betweenness').val();
    const cutoffEigenvector = $('#input_cutoff_eigenvector').val();

    const limit = $('#input_limit').val();

    if (sharedData === undefined) {
      let nodes = await this.controller.get_ceRNA({
        disease_name: diseaseTrimmed,
        sorting: sortBy,
        limit,
        minBetweenness: cutoffBetweenness,
        minEigenvector: cutoffEigenvector,
        descending: true,
        error: (response) => {
          this.helper.msg(
            'Something went wrong while loading the ceRNAs. Perhaps try a smaller limit.',
            true
          );
        },
      });
      nodes = this.parse_node_data(this.helper, sharedData, nodes);
      this.numberNodesAfterRequest = nodes.length;
      return nodes;
    } else {
      // kinda tricky construct, we load first the information for the search keys +
      // marked nodes since we want to give them higher priority and then for the rest until limit
      const data = await this.controller.get_ceRNA({
        disease_name: diseaseTrimmed,
        ensg_number: sharedData.search_keys.concat(sharedData.nodes_marked),
        limit,
      });

      let genesWithoutKeysOrMarked = sharedData.nodes;
      genesWithoutKeysOrMarked = genesWithoutKeysOrMarked.filter(
        (el) =>
          !sharedData.search_keys.concat(sharedData.nodes_marked).includes(el)
      );
      if (genesWithoutKeysOrMarked.length > 500) {
        // manually limiting query size since it would cause an error due to url length limitations.
        // Nobody is going to be able to display more than 500 genes anyway
        genesWithoutKeysOrMarked = genesWithoutKeysOrMarked.slice(0, 500);
      }

      if (genesWithoutKeysOrMarked.length === 0) {
        // only interactions between search keys
        return this.parse_node_data(this.helper, sharedData, data);
      }

      const data2 = await this.controller.get_ceRNA({
        disease_name: diseaseTrimmed,
        ensg_number: genesWithoutKeysOrMarked,
        limit:
          limit -
          (sharedData.search_keys.length + sharedData.nodes_marked.length),
        sorting: sortBy,
        minBetweenness: cutoffBetweenness,
        minEigenvector: cutoffEigenvector,
        descending: true,
        error: (response) => {
          this.helper.msg(
            'Something went wrong while loading the ceRNAs. Perhaps try a smaller limit.',
            true
          );
        },
      });


      const allData = data.concat(data2);
      const nodes = this.parse_node_data(this.helper, sharedData, allData);

      if (
        genesWithoutKeysOrMarked.length +
          sharedData.search_keys.length +
          sharedData.nodes_marked.length >
        limit
      ) {
        // create info message
        if (!$('#network_messages .alert-nodes').length) {
          $('#network_messages').append(
            `
                      <!-- Info Alert -->
                      <div class="alert alert-info alert-dismissible fade show alert-nodes">
                          <strong>N.B.</strong> ${
                            genesWithoutKeysOrMarked.length +
                            sharedData.search_keys.length +
                            sharedData.nodes_marked.length
                          } genes
                          were found in your search, the current displaying limit is ${limit}. If you want to display more,
                           increase the limit and press "Go".
                          <button type="button" class="close" data-dismiss="alert">&times;</button>
                      </div>
                      `
          );
        }
      }
      return nodes;
    }
  }
  private async getBatchesRecursive(
    nodes,
    diseaseTrimmed,
    allData,
    pValue,
    limit,
    sharedData,
    offset = 0
  ) {
    const specificCeRNAInteractions =
      await this.controller.get_ceRNA_interactions_specific({
        disease_name: diseaseTrimmed,
        ensg_number: nodes,
        limit,
        offset,
        pValue,
        pValueDirection: '<',
        error: () => {
          // helper.msg("Something went wrong while loading the interactions.", true)
          return [];
        },
      });

    allData = allData.concat(specificCeRNAInteractions);

    // limit !== 1000 checks if limit is set by user
    if (limit === 1000 && specificCeRNAInteractions.length === limit) {
      // there are more interactions to load, call function again
      await this.getBatchesRecursive(
        nodes,
        diseaseTrimmed,
        allData,
        pValue,
        limit,
        sharedData,
        offset + limit
      );
    } else {
      // check if we got any interactions
      if (allData.length === 0) {
        return [];
      }

      // all batches are loaded, continue processing the all_data
      const orderedData = [];

      const numberEdges = Object.keys(allData).length;

      // also removes "run"
      for (let i = 0; i < numberEdges; i++) {
        const entry = allData[i];

        if (sharedData !== undefined && sharedData.search_keys) {
          if (
            !(
              sharedData.search_keys.includes(entry.gene1.ensg_number) ||
              sharedData.search_keys.includes(entry.gene2.ensg_number)
            )
          ) {
            // interaction has no direct connection to search keys, ignore interaction
            continue;
          }
        }
        // change order of columns alredy in object
        const orderedEntry = {};
        orderedEntry['Gene 1'] = entry.gene1.ensg_number;
        orderedEntry['Gene 2'] = entry.gene2.ensg_number;
        orderedEntry['Correlation'] = entry.correlation;
        orderedEntry['MScor'] = entry.mscor;
        orderedEntry['adjusted p-value'] = entry.p_value;
        orderedEntry['ID'] = i;
        orderedEntry['miRNAs'] = ``;
        orderedData.push(orderedEntry);
      }

      if (orderedData.length === 0) {
        $('#network-plot-container').html(
          '<p style="margin-top:150px">No data was found for your search parameters or search genes.</p>'
        );
        // $('#disease_selectpicker').attr('disabled',false)
        return;
      }

      const columnNames = Object.keys(orderedData[0]);
      $('#interactions-edges-table-container').append(
        this.helper.buildTable(
          orderedData,
          'interactions-edges-table',
          columnNames
        )
      );

      // find index positions from columns to round
      const indexCorrelation = columnNames.indexOf('Correlation');
      const indexMscor = columnNames.indexOf('MScor');
      const indexPValue = columnNames.indexOf('adjusted p-value');

      // order by p-value or mscor
      let orderBy;
      let orderByAscDesc;
      if ($('#interactions_filter_by').val() === 'adjusted p-value') {
        orderBy = 4;
        orderByAscDesc = 'asc';
      } else if ($('#interactions_filter_by').val() === 'Mscor') {
        orderBy = 3;
        orderByAscDesc = 'desc';
      } else if ($('#interactions_filter_by').val() === 'Correlation') {
        orderBy = 2;
        orderByAscDesc = 'desc';
      }

      const searchKey = sharedData !== undefined ? sharedData.search_keys : '';
      const diseaseName = $('#disease_selectpicker').val();
      const filename = `SPONGEdb Interactions ${diseaseName} ${searchKey}`;
      if (this.edgeTable) {
        this.edgeTable.destroy();
      }
      this.edgeTable = $('#interactions-edges-table').DataTable({
        columnDefs: [
          { width: '20%', targets: 6 },
          {
            render(orderedColumnData) {
              let numb = parseFloat(orderedColumnData).toFixed(4);
              if (parseFloat(numb) === 0 && numb.length > 1) {
                // numb is sth like 0.00000001212, we set it to 0.0001 bc it is not 0
                numb = numb.substring(0, numb.length - 2) + 1;
              }
              return numb;
            },
            targets: [indexCorrelation, indexMscor, indexPValue],
          },
        ],
        dom: '<"top"Bf>rt<"bottom"lip>',
        buttons: [
          {
            text: 'Copy',
            // to make sure that all mirnas have been loaded
            action(e, dt, button, config) {
              const buttonThis = this;

              buttonThis.processing(true); // show indicator on button
              const mirnaPromises = this.getMirnaCol(
                this.controller,
                dt,
                diseaseName
              );
              config.filename = filename; // set filename
              Promise.all(mirnaPromises).then(() => {
                $.fn.dataTable.ext.buttons.copyHtml5.action.call(
                  buttonThis,
                  e,
                  dt,
                  button,
                  config
                ); // call export-action
                buttonThis.processing(false); // hide indicator on button
              });
            },
          },
          {
            extend: 'csv',
            text: 'CSV',
            // to make sure that all mirnas have been loaded
            action(e, dt, button, config) {
              const buttonThis = this;

              buttonThis.processing(true); // show indicator on button
              const mirnaPromises = this.getMirnaCol(
                this.controller,
                dt,
                diseaseName
              );
              config.filename = filename; // set filename
              Promise.all(mirnaPromises).then(() => {
                $.fn.dataTable.ext.buttons.csvHtml5.action.call(
                  buttonThis,
                  e,
                  dt,
                  button,
                  config
                ); // call export-action
                buttonThis.processing(false); // hide indicator on button
              });
            },
          },
          {
            text: 'Excel',
            // to make sure that all mirnas have been loaded
            action(e, dt, button, config) {
              const buttonThis = this;

              buttonThis.processing(true); // show indicator on button
              const mirnaPromises = this.getMirnaCol(
                this.controller,
                dt,
                diseaseName
              );
              config.filename = filename + '.xlsx'; // set filename
              Promise.all(mirnaPromises).then(() => {
                $.fn.dataTable.ext.buttons.excelHtml5.action.call(
                  buttonThis,
                  e,
                  dt,
                  button,
                  config
                ); // call export-action
                buttonThis.processing(false); // hide indicator on button
              });
            },
          },
          // { removed due to bad formation of default pdf file
          //   extend: 'pdfHtml5',
          //   title: filename
          // },
        ],

        responsive: true,
        // scrollX:  true,
        lengthMenu: [
          [10, 25, 50, -1],
          [10, 25, 50, 'All'],
        ],
        order: [[orderBy, orderByAscDesc]],
      });
      this.edgeTable.draw();
      $('#interactions-edges-table tbody').on('click', 'tr', () => {
        $(this).toggleClass('selected');
      });
      $('#filter_edges :input').keyup(() => {
        this.edgeTable.draw();
      });
      // colsearch for table
      this.helper.colSearch('interactions-edges-table', this.edgeTable);

      // hide mirna column on opening for layout reasons
      $('#edge_table_toggle_mirnas').click();

      const edgesRaw = this.edgeTable.data();
      //genome browser
      const columnValues = edgesRaw.map((item) => item[5]);
      console.info('edge data');
      console.info(columnValues);
      //TODO add HTTP to backend sending the mRNA and miRNA data
      //genome browser

      const edges = [];
      for (let i = 0; i < edgesRaw.length; i++) {
        const interaction = edgesRaw[i];
        const id = interaction[5]; // ID
        const source = interaction[0]; // Gene 1
        const target = interaction[1]; // Gene 2
        const size = Math.abs(20 * interaction[3]); // MScor
        const color = this.helper.choose_edge_color(interaction[4]); // p-value
        edges.push({
          id,
          source,
          target,
          size,
          color,
        });
      }
      $('#edge_data').text(JSON.stringify(orderedData));


      return edges;
    }
  }

  ngOnInit() {
    const sharedData: any = this.sharedService.getData()
      ? this.sharedService.getData()
      : undefined;

    let urlStorage; // save here which nodes and edges to mark while API data is loading

    this.numberNodesAfterRequest = 0;
    const defaultNodeLimit = 25;
    $('#input_limit').val(defaultNodeLimit);

    const session = null;

    // first things first, define dimensions of network container
    $('#network-plot-container-parent').css(
      'height',
      $('#network-plot-container').width()
    );
    $(window).on('resize', () => {
      $('#network-plot-container-parent').css(
        'height',
        $('#network-plot-container').width()
      );
    });

    /* Datatable configurations */
    $.fn.dataTable.ext.search.push(
      // filter for mscor
      (settings, data, dataIndex) => {
        if (settings.nTable.id !== 'interactions-edges-table') {
          return true;
        }
        const mscor_min = parseFloat($('#mscor_min').val());
        const mscor_max = parseFloat($('#mscor_max').val());
        const mscor = parseFloat(data[3]) || 0; // use data for the mscor column
        if (
          (isNaN(mscor_min) && isNaN(mscor_max)) ||
          (isNaN(mscor_min) && mscor <= mscor_max) ||
          (mscor_min <= mscor && isNaN(mscor_max)) ||
          (mscor_min <= mscor && mscor <= mscor_max)
        ) {
          return true;
        }
        return false;
      },
      //  filter for pvalue
      (settings, data) => {
        if (settings.nTable.id !== 'interactions-edges-table') {
          return true;
        }
        const pvalue_min = parseFloat($('#pvalue_min').val());
        const pvalue_max = parseFloat($('#pvalue_max').val());
        const pvalue = parseFloat(data[4]) || 0; // use data for the pvalue column
        if (
          (isNaN(pvalue_min) && isNaN(pvalue_max)) ||
          (isNaN(pvalue_min) && pvalue <= pvalue_max) ||
          (pvalue_min <= pvalue && isNaN(pvalue_max)) ||
          (pvalue_min <= pvalue && pvalue <= pvalue_max)
        ) {
          return true;
        }
        return false;
      },
      //  filter for correlation
      (settings, data, dataIndex) => {
        if (settings.nTable.id !== 'interactions-edges-table') {
          return true;
        }
        const correlation_min = parseFloat($('#correlation_min').val());
        const correlation_max = parseFloat($('#correlation_max').val());
        const correlation = parseFloat(data[2]) || 0; // use data for the correlation column
        if (
          (isNaN(correlation_min) && isNaN(correlation_max)) ||
          (isNaN(correlation_min) && correlation <= correlation_max) ||
          (correlation_min <= correlation && isNaN(correlation_max)) ||
          (correlation_min <= correlation && correlation <= correlation_max)
        ) {
          return true;
        }
        return false;
      }
    );
    /* end of configurations */

    this.activateClickListeners();

    // ##################################################################################
    // Here we check if there is information (e.g. from session or from search) to load
    /* In case we restore an old session */
    this.activatedRoute.queryParams.subscribe((params) => {
      if (Object.keys(params).length > 0) {
        // there are url params, load previous session
        urlStorage = this.helper.load_session_url(params);
      }
    });

    /* In case we passed data from search to browse (shared service), set cancer type and disable select */
    if (sharedData !== undefined) {
      $('#disease_selectpicker').val(sharedData.cancer_type);
      $('#disease_selectpicker').attr('disabled', true);
      $('#disease_selectpicker').selectpicker('refresh');

      // we also rename the Browse Header
      $('#title-BG h1').text('Search Result');

      // we also want to remove options that are not valid
      $('#disease_selectpicker option').each(() => {
        if (
          !sharedData.interactive_cancer_types.includes(
            $(this).text().toLowerCase()
          )
        ) {
          $(this).addClass('hidden');
        }
      });
    }
    // ##################################################################################
    this.runInformation(sharedData, session, urlStorage);
  }
  private runInformation(sharedData, session, urlStorage) {
    // ALL TS FOR TAB RUN INFORMATION

    // initialize selectpicker
    $('#disease_selectpicker').selectpicker();
    $('#run-info-select').selectpicker();
    $('#interactions_filter_by').selectpicker();
    $('#disease_subtype').selectpicker();

    // takes care of button with link to download page
    // loads specific run information
    $('#load_disease').click(async () => {
      this.automaticInteractionValueChange = false;
      await this.loadDisease(sharedData, session, urlStorage);
    });
    $('#load_disease').click();
  }
  private async loadDisease(shared_data, session, url_storage) {
    const diseaseSelector = $('#disease_selectpicker');
    const selected_disease_result = $('#selector_disease_result');
    // before we do anything, we check if the input values are valid
    const cutoff_eigenvector = $('#input_cutoff_eigenvector').val();
    // check the eigenvector cutoff since it is different to the others
    if (cutoff_eigenvector < 0 || cutoff_eigenvector > 1) {
      this.helper.msg('The eigenvector should be between 0 and 1.', true);
      return;
    }

    // start loading
    // disease_selector.attr('disabled',true)
    $('#network-plot-container').html(''); // clear possible other network
    $('#network_graph_placeholder').removeClass('hidden');
    if ($('#interactions-nodes-table').length) {
      this.nodeTable.destroy();
      this.edgeTable.destroy();

      $('#interactions-nodes-table-container').empty(); // clear possible older tables
      $('#interactions-edges-table-container').empty(); // clear possible older tables

      $('#expression_heatmap').empty(); // clear possible older expression map
      $('#network_messages').empty();
      $('#plots').empty();
    }

    this.selectedDisease = diseaseSelector.val().toString();
    const download_url = diseaseSelector
      .find(':contains(' + this.selectedDisease + ')')
      .attr('data-value');
    let subtype = $('#disease_subtype').val();
    if (
      subtype !== undefined &&
      subtype.toString() !== 'None' &&
      subtype.toString() !== ''
    ) {
      // Sanitize "+"
      this.selectedDisease = subtype.replace('+', '%2b');
    } else {
      await BrowseComponent.loadSubtypes(this.controller, this.selectedDisease);
    }
    if (shared_data && shared_data.subtype) {
      $('#disease_subtype').val(shared_data.subtype);
      $('#disease_subtype').attr('disabled', true);
      $('#disease_subtype').selectpicker('refresh');
      subtype = $('#disease_subtype').val();
    }
    if (subtype && subtype.toString() !== 'None' && subtype.toString() !== '') {
      this.selectedDisease = subtype.replace('+', '%2b');
    }
    this.diseaseTrimmed = this.selectedDisease.split(' ').join('%20');
    const disease_data_link = $('#selector_diseases_link');
    if (download_url.startsWith('http')) {
      if (disease_data_link.hasClass('hidden')) {
        disease_data_link.removeClass('hidden');
        disease_data_link.find('button').removeClass('disabled');
      }
      disease_data_link.attr('href', download_url);
    } else {
      if (!disease_data_link.hasClass('hidden')) {
        disease_data_link.removeAttr('href');
        disease_data_link.addClass('hidden');
        disease_data_link.find('button').addClass('disabled');
      }
    }

    // get specific run information
    let data = await this.controller.get_dataset_information(
      this.diseaseTrimmed
    );

    selected_disease_result.html('');
    data = data[0];

    // header
    const header = data.dataset.disease_name;
    data.dataset = null;

    const run_table = document.createElement('table');
    const run_name = document.createElement('th');
    run_name.innerHTML = Helper.uppercaseFirstLetter(header);

    run_name.setAttribute('style', 'text-decoration:underline');

    const table = document.createElement('tr');
    table.appendChild(run_name);

    const table_keys = document.createElement('td');
    const table_values = document.createElement('td');

    for (const key in data) {
      let value = data[key];
      if (value == null) {
        value = 'Not defined';
      }
      if (key === 'ks') {
        value = value.substring(4, value.length - 1);
      }

      const table_entry = document.createElement('tr');
      table_entry.innerHTML = Helper.uppercaseFirstLetter(key);
      table_entry.setAttribute('style', 'margin-right:2px');

      table_keys.appendChild(table_entry);

      const table_entryV = document.createElement('tr');
      table_entryV.innerHTML = value;
      table_entryV.setAttribute('style', 'margin-left:-5px');

      table_values.appendChild(table_entryV);
    }

    table_keys.setAttribute(
      'style',
      'position:relative; top:38px;padding-right:15px'
    );
    table_values.setAttribute('style', 'position:relative;top: 38px');
    table.setAttribute('style', 'position:absolute;margin-bottom:20px');
    run_table.appendChild(table);
    run_table.appendChild(table_keys);
    run_table.appendChild(table_values);
    selected_disease_result.append(run_table);
    /* Construct sigma js network plot and expression plot*/
    // load interaction data (edges), load network data (nodes)

    let nodes = await this.load_nodes(shared_data, this.diseaseTrimmed);
    const ensg_numbers = nodes.map((node) => node.id);

    // start loading heatmap simultaneously
    // set maximum amount of genes for heatmap, it gets to be too much with a certain amount (readability + loading time)
    if (ensg_numbers.length < 51) {
      // load expression data
      this.helper.load_heatmap(this.diseaseTrimmed, ensg_numbers);
    }

    let edges = await this.load_edges(
      shared_data,
      this.diseaseTrimmed,
      ensg_numbers
    );
    /*
      STEP 1: apply edge filters like p-value and mscor
    */

    // take the maximum p-value into account
    let maximum_p_value = $('#input_maximum_p_value').val();
    if (!isNaN(parseFloat(maximum_p_value)) && maximum_p_value.length > 0) {
      const edges_to_remove = [];
      const edges_to_remove_ids = [];
      this.edgeTable.rows().every(function () {
        if (maximum_p_value < this.data()[4]) {
          edges_to_remove.push(this.node());
          edges_to_remove_ids.push(this.data()[5]);
        }
      });
      edges_to_remove.forEach((edge) => {
        this.edgeTable.row(edge).remove();
      });
      this.edgeTable.draw();

      // remove filtered edges from edges object for network
      const filtered_edges = [];
      edges.forEach((edge) => {
        if (!edges_to_remove_ids.includes(edge.id)) {
          filtered_edges.push(edge);
        }
      });
      // override edges list
      edges = filtered_edges;
    } // end of maximum p value filter

    // take the minimum MScor into account
    let minimum_mscor = $('#input_minimum_mscor').val();
    if (!isNaN(parseFloat(minimum_mscor)) && minimum_mscor.length > 0) {
      const edges_to_remove = [];
      const edges_to_remove_ids = [];
      this.edgeTable.rows().every(function (rowIdx, tableLoop, rowLoop) {
        if (minimum_mscor > this.data()[3]) {
          edges_to_remove.push(this.node());
          edges_to_remove_ids.push(this.data()[5]);
        }
      });
      edges_to_remove.forEach((edge) => {
        this.edgeTable.row(edge).remove();
      });
      this.edgeTable.draw();

      // remove filtered edges from edges object for network
      const filtered_edges = [];
      edges.forEach((edge) => {
        if (!edges_to_remove_ids.includes(edge.id)) {
          filtered_edges.push(edge);
        }
      });
      // override edges list
      edges = filtered_edges;
    } // end of maximum p value filter

    /*
      STEP 2: limit edge number to user limit
    */
    let user_limit;
    // check if limit is set by user and is acutally a number
    if (
      $('#input_limit_interactions').val() &&
      !isNaN($('#input_limit_interactions').val())
    ) {
      user_limit = $('#input_limit_interactions').val();
    }

    if (!isNaN(parseFloat(user_limit)) && user_limit.length > 0) {
      const edges_to_remove = [];
      const edges_to_remove_ids = [];
      // edges table is ordered by p-value (ascending)
      let interaction_counter = 0;
      this.edgeTable.rows().every(function (rowIdx, tableLoop, rowLoop) {
        interaction_counter++;
        if (interaction_counter > user_limit) {
          edges_to_remove.push(this.node());
          edges_to_remove_ids.push(this.data()[5]);
        }
      });

      edges_to_remove.forEach((edge) => {
        this.edgeTable.row(edge).remove();
      });
      this.edgeTable.draw();

      // remove filtered edges from edges object for network
      const filtered_edges = [];
      edges.forEach((edge) => {
        if (!edges_to_remove_ids.includes(edge.id)) {
          filtered_edges.push(edge);
        }
      });

      // override edges list
      edges = filtered_edges;
    }

    /*
      STEP 3: Apply node degree filter + sort out unused edges afterwards
    */
    const cutoff_degree = $('#input_cutoff_degree').val();
    if (!isNaN(parseFloat(cutoff_degree)) && cutoff_degree.length > 0) {
      // cutoff is set, filter nodes
      const node_degrees = {};
      const filtered_nodes = [];

      for (const node of nodes) {
        node_degrees[node.id] = 0;
        for (const edge of edges) {
          if (edge.source === node.id || edge.target === node.id) {
            node_degrees[node.id] += 1;
          }
        }
        if (cutoff_degree <= node_degrees[node.id]) {
          filtered_nodes.push(node);
        }
      }
      // override nodes object
      nodes = filtered_nodes;

      // we must remove the node entries from the datatable for consistency
      const nodes_to_remove = [];
      this.nodeTable.rows().every(function () {
        if (!(cutoff_degree <= node_degrees[this.data()[0]])) {
          nodes_to_remove.push(this.node());
        }
      });
      nodes_to_remove.forEach((node) => {
        this.nodeTable.row(node).remove();
      });
      this.nodeTable.draw();

      // now we must sort out unused edges again
      const filtered_edges = [];
      edges.forEach((edge) => {
        if (
          cutoff_degree <= node_degrees[edge.target] &&
          cutoff_degree <= node_degrees[edge.source]
        ) {
          filtered_edges.push(edge);
        }
      });
      // override edges list
      edges = filtered_edges;

      // now we must update the edges table
      const edges_to_remove = [];
      this.edgeTable.rows().every(function () {
        if (
          !(cutoff_degree <= node_degrees[this.data()[0]]) ||
          !(cutoff_degree <= node_degrees[this.data()[1]])
        ) {
          edges_to_remove.push(this.node());
        }
      });
      edges_to_remove.forEach((edge) => {
        this.edgeTable.row(edge).remove();
      });
      this.edgeTable.draw();
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
        );
      }
    } else if (Object.keys(nodes).length === 0) {
      if (!$('#network_messages .alert-edges').length) {
        // remove possible node information since it is not important in this case
        $('#network_messages .alert-nodes').remove();

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
        );
      }
    } else if (this.numberNodesAfterRequest === $('#input_limit').val()) {
      if (!$('#network_messages .alert-edges').length) {
        // remove possible node information since it is not important in this case
        $('#network_messages .alert-nodes').remove();
        $('#network_messages').append(
          `
                    <!-- Info Alert -->
                    <div class="alert alert-info alert-dismissible fade show alert-edges">
                        <strong>N.B.</strong> Due to long loading times, we cannot show all results in the network.
                        If you want to see more, you can increase the threshold parameters (left hand side) and press "Go" again.
                        <button type="button" class="close" data-dismiss="alert">&times;</button>
                    </div>
                    `
        );
      }
    } else {
      // clear old messages
      $('#network_messages .alert-edges').remove();
    }

    let network = null;
    const networkData = await this.helper.make_network(
      this.diseaseTrimmed,
      nodes,
      edges,
      this.nodeTable,
      this.edgeTable
    );
    if (
      networkData === null &&
      this.automaticInteractionValueChange &&
      !this.secondIterationAutomaticChange
    ) {
      this.secondIterationAutomaticChange = true;
      $('#input_maximum_p_value').val(0.8);
      $('#input_minimum_mscor').val(0.01);
      maximum_p_value = 0.8;
      minimum_mscor = 0.01;
      this.loadDisease(shared_data, session, url_storage);
    }
    if (networkData === null && BrowseComponent.isDefault()) {
      this.automaticInteractionValueChange = true;
      $('#input_maximum_p_value').val(0.1);
      $('#input_minimum_mscor').val(0.01);
      maximum_p_value = 0.1;
      minimum_mscor = 0.01;
      this.loadDisease(shared_data, session, url_storage);
    }
    if (this.automaticInteractionValueChange) {
      $('#network_messages .alert-nodes').remove();
      $('#network_messages').append(
        `
                    <!-- Info Alert -->
                    <div class="alert alert-info alert-dismissible fade show alert-edges">
                        <strong>N.B.</strong> We found no nodes fitting the original default search criteria.
                        P-value (0.01) and Mscor (0.1) were adjusted to P-value (${maximum_p_value}) and Mscor (${minimum_mscor}) to present results.
                        <button type="button" class="close" data-dismiss="alert">&times;</button>
                    </div>
                    `
      );
    }
    console.log(networkData);
    if (networkData === null) {
      // we have no network data bc e.g. we have no nodes due to filters
      network = undefined;
      session = undefined;
      return;
    }
    network = networkData.network;
    session = networkData.session;

    // trigger force atlas 2
    $('#toggle_layout').click();

    $('#export_selected_edges').click(() => {
      // mark all marked edges in the graph
      const selected_edges = this.edgeTable
        .rows('.selected', {
          filter: 'applied',
        })
        .data();

      // DONT show the rest of the edges that are not in the table
      const filtered_edges_raw = this.edgeTable
        .rows({ filter: 'applied' })
        .data();
      const filtered_edges_ids = [];
      for (let i = 0; i < filtered_edges_raw.length; i++) {
        filtered_edges_ids.push(filtered_edges_raw[i][5]);
      }
      this.helper.limit_edges_to(network, filtered_edges_ids);

      if (selected_edges.length > 0) {
        // only mark edges and grey out rest if any edge is selected
        this.helper.mark_edges_network(network, selected_edges);
      }

      // go to network
      $('[aria-controls=nav-overview]').click();

      setTimeout(() => {
        $('#restart_camera').click();
        $('#toggle_layout').click();
      }, 200);
    });

    /*Gene Enrichment Button*/
    $('#export_gene_enrichment').click(() => {
      const selected_nodes = [];
      const selected_nodes_data = this.nodeTable
        .rows('.selected', {
          filter: 'applied',
        })
        .data();

      for (let i = 0; i < selected_nodes_data.length; i++) {
        // first row is ensg number
        selected_nodes.push(selected_nodes_data[i][0]);
      }

      const nodes_for_ge = [];

      for (let i = 0; i < nodes.length; i++) {
        // first row is ensg number
        nodes_for_ge.push(nodes[i].id);
      }

      let url;
      let query;
      if (selected_nodes.length !== 0) {
        query = selected_nodes.join('%0A');
        url =
          'https://biit.cs.ut.ee/gprofiler/gost?organism=hsapiens&query=' +
          query +
          '&ordered=false&all_results=false&no_iea=false&combined=false&measure_underrepresentation=false&domain_scope=annotated&significance_threshold_method=g_SCS&user_threshold=0.05&numeric_namespace=ENTREZGENE_ACC&sources=GO:MF,GO:CC,GO:BP,KEGG,TF,REAC,MIRNA,HPA,CORUM,HP,WP&background=';
      } else {
        query = nodes_for_ge.join('%0A');
        url =
          'https://biit.cs.ut.ee/gprofiler/gost?organism=hsapiens&query=' +
          query +
          '&ordered=false&all_results=false&no_iea=false&combined=false&measure_underrepresentation=false&domain_scope=annotated&significance_threshold_method=g_SCS&user_threshold=0.05&numeric_namespace=ENTREZGENE_ACC&sources=GO:MF,GO:CC,GO:BP,KEGG,TF,REAC,MIRNA,HPA,CORUM,HP,WP&background=';
      }

      window.open(url);
    });
    $('#export_selected_nodes').click(() => {
      // helper.clear_subgraphs(network);
      const selected_nodes = [];
      const selected_nodes_data = this.nodeTable
        .rows('.selected', {
          filter: 'applied',
        })
        .data();
      for (let i = 0; i < selected_nodes_data.length; i++) {
        // first row is ensg number
        selected_nodes.push(selected_nodes_data[i][0]);
      }

      const filtered_nodes_raw = this.nodeTable
        .rows({ filter: 'applied' })
        .data();
      const filtered_nodes_ids = [];
      for (let i = 0; i < filtered_nodes_raw.length; i++) {
        filtered_nodes_ids.push(filtered_nodes_raw[i][0]);
      }

      if (network === undefined) {
        // nodes are selected for loading in network but filter criteria are too strict so no network data is left
        return;
      }
      this.helper.limit_nodes_to(network, filtered_nodes_ids);

      this.helper.mark_nodes_network(network, selected_nodes);

      // load KMP
      this.helper.load_KMP(selected_nodes, '', selected_disease_result);

      // go to network
      $('[aria-controls=nav-overview]').click();
      setTimeout(() => {
        // network.refresh()
        $('#restart_camera').click();
        $('#toggle_layout').click();
      }, 200);
    });

    // ##################################################################################
    // Here we check if there is data to be marked in the network/tables (e.g. from old session of search)
    // check if there is data in the shared_service, meaning we came from search and want to load specific data
    if (shared_data !== undefined) {
      console.log(shared_data);
      if (shared_data.nodes_marked.length) {
        this.helper.mark_nodes_table(this.nodeTable, shared_data.nodes_marked);

        $('#export_selected_nodes').click();

        this.helper.load_KMP(shared_data.nodes_marked, '', this.diseaseTrimmed);
      }
      const $this = this;
      // if we come from search, we want to have a back button
      if (!$('#network_messages .back').length) {
        $('#network_messages').append(
          `
                    <button type="button" class="btn btn-primary back">Back to Search</button>
                  `
        );
        $('#network_messages .back').click(() => {
          $this.location.back();
        });
      }
    } else if (url_storage && Object.keys(url_storage)) {
      if ('nodes' in url_storage && url_storage.nodes.length) {
        // mark nodes in nodes table
        this.helper.mark_nodes_table(this.nodeTable, url_storage.nodes);
        // mark nodes in graph
        $('#export_selected_nodes').click();

        this.helper.load_KMP(shared_data.nodes_marked, '', this.diseaseTrimmed);
      }
      /*
      // TODO:  we currently cant restore edges bc of missing ids
      if ('edges' in url_storage && url_storage['edges'].length) {
        helper.mark_edges_table(edgeTable, url_storage['edges'])
        // mark edges in graph
        $('#export_selected_edges').click()
      }*/
      // ##################################################################################
    }

    // set maximum amount of genes for heatmap, it gets too much wich a ceartain amoung (readability + loading time)
    // if (ensg_numbers.length < 51){
    //   // load expression data
    //   helper.load_heatmap(this.disease_trimmed, ensg_numbers)
    // }

    // stop loading screen
    diseaseSelector.attr('disabled', false);

    // load mirnas in background
    const mirna_promises = this.getMirnaCol(
      this.controller,
      this.edgeTable,
      this.diseaseTrimmed
    );
    Promise.all(mirna_promises).then((values) => {
      this.edgeTable.draw();
    });
  }
  private getMirnaCol(controller, edgeTable, disease_name) {
    const mirnaPromises = [];
    // load mirnas
    this.edgeTable.rows().every(function (rowIdx, tableLoop, rowLoop) {
      const data = this.data();
      if (data[6].length === 0) {
        const p = new Promise((resolve) => {
          controller.get_miRNA_by_ceRNA({
            disease_name,
            ensg_number: [data[0], data[1]],
            between: true,
            callback: (response) => {
              // there can be duplicates
              const mirnas = {};
              for (const entry of response) {
                mirnas[entry.mirna.hs_nr + `&nbsp;(${entry.mirna.mir_ID})`] =
                  true;
              }

              const mirnasString = Object.keys(mirnas).join(',<br />');
              edgeTable
                .cell({
                  row: rowIdx,
                  column: 6,
                })
                .data(mirnasString);
              return Promise.resolve();
            },
            error: () => {
              edgeTable
                .cell({
                  row: rowIdx,
                  column: 6,
                })
                .data('-');
              return Promise.resolve();
            },
          });
        });
        mirnaPromises.push(p);
      }
    });
    return mirnaPromises;
  }
  private async load_edges(shared_data, disease_trimmed, nodes) {
    // API batch limit is 1000 interactions, iterating until we got all batches
    const limit = 1000;

    let p_value;
    if (shared_data != undefined) {
      p_value = shared_data.p_value;
    } else {
      p_value = 1;
    }

    const all_data = [];
    return await this.getBatchesRecursive(
      nodes,
      disease_trimmed,
      all_data,
      p_value,
      limit,
      shared_data
    );
  }

  private parse_node_data(helper, shared_data, data) {
    /*
    parses the returned node data from the api
    */

    const ordered_data = [];
    for (let i = 0; i < Object.keys(data).length; i++) {
      const entry = data[i];
      // change order of columns alredy in object
      const ordered_entry = {};
      // flatten data object
      for (const x in entry.gene) {
        entry[x] = entry.gene[x];
      }
      ordered_entry['ENSG Number'] = entry.ensg_number;
      ordered_entry['Gene Symbol'] =
        entry.gene_symbol == null ? '-' : entry.gene_symbol;
      ordered_entry['Betweenness'] = entry.betweenness;
      ordered_entry['Eigenvector'] = entry.eigenvector;
      ordered_entry['DB Degree'] = entry.node_degree;
      ordered_entry['Hallmarks'] = 'hallmark';
      ordered_entry['Pathway'] = 'pathway';
      ordered_entry['GeneCard'] = 'genecard';
      ordered_entry['Gene Ontology'] = 'go';
      ordered_data.push(ordered_entry);
    }
    const nodes = [];

    for (const gene in ordered_data) {
      const id = ordered_data[gene]['ENSG Number'];
      let label = ordered_data[gene]['Gene Symbol'];
      if (label == '-') {
        label = ordered_data[gene]['ENSG Number'];
      }
      const x = ordered_data[gene].Betweenness * 10; // helper.getRandomInt(10)
      const y = ordered_data[gene].Eigenvector * 10; // helper.getRandomInt(10)
      const size = Math.sqrt(ordered_data[gene]['DB Degree']) / 10;
      const color = helper.default_node_color;
      nodes.push({
        id,
        label,
        x,
        y,
        size,
        color,
      });
    }

    // build datatable
    const column_names = Object.keys(ordered_data[0]);

    // find index positions from columns to round
    const index_betweenness = column_names.indexOf('Betweenness');
    const index_eigenvector = column_names.indexOf('Eigenvector');
    $('#interactions-nodes-table-container').append(
      helper.buildTable(ordered_data, 'interactions-nodes-table', column_names)
    );
    helper.buildTable_GO_HM('interactions-nodes-table');

    const search_key = shared_data != undefined ? shared_data.search_keys : '';
    const disease_name = $('#disease_selectpicker').val();
    const filename = `SPONGEdb Genes ${disease_name} ${search_key}`;
    if (this.nodeTable) {
      this.nodeTable.destroy();
    }
    this.nodeTable = $('#interactions-nodes-table').DataTable({
      columnDefs: [
        {
          render(ordered_data, type, row) {
            return ordered_data.toString().match(/\d+(\.\d{1,3})?/g)[0];
          },
          targets: [index_betweenness, index_eigenvector],
        },
      ],
      dom: '<"top"Bf>rt<"bottom"lip>',
      buttons: [
        {
          extend: 'copyHtml5',
          title: filename,
          exportOptions: {
            columns: [0, 1, 2, 3, 4],
          },
        },
        {
          extend: 'csvHtml5',
          title: filename,
          exportOptions: {
            columns: [0, 1, 2, 3, 4],
          },
        },
        {
          extend: 'excelHtml5',
          title: filename,
          exportOptions: {
            columns: [0, 1, 2, 3, 4],
          },
        },
        // { removed due to bad formation of default pdf file
        //   extend: 'pdfHtml5',
        //   title: filename
        // },
        {
          extend: 'print',
          title: filename,
        },
      ],
      lengthMenu: [
        [10, 25, 50, -1],
        [10, 25, 50, 'All'],
      ],
      responsive: true,
      // scrollX:  true,
    });
    this.nodeTable.draw();

    $('#interactions-nodes-table div').append(
      "<button class='export_nodes_enrichment btn btn-primary button-margin' style='float: left;'>Gene Set Enrichment Analysis<br> (external)</button>"
    );

    // colsearch for table
    helper.colSearch('interactions-nodes-table', this.nodeTable);

    $('#interactions-nodes-table tbody').on('click', 'tr', () => {
      $(this).toggleClass('selected');
    });
    // save data for later search
    $('#node_data').text(JSON.stringify(ordered_data));

    /* plot expression data for nodes */
    // helper.expression_heatmap_genes(disease_trimmed, ensg_numbers, 'expression_heatmap')
    return nodes;
  }
}
