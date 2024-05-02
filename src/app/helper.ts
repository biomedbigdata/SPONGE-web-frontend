import { Controller } from '../app/control';
import { Session } from '../app/session';
import sigma from 'sigma';
import { element } from 'protractor';
import { SharedService } from '../app/services/shared/shared.service';
import { IGVInput } from './interfaces';

// wtf you have to declare sigma after importing it
declare const sigma: any;
declare var Plotly: any;
declare var $: any;

export class Helper {
  /** Cancer abbreviation to normal name, used for subtypes. IMPORTANT: Adding more entries to this map might change the behaviour of
   * the search.component, as this map determines if there are subtypes networks for the specified cancer type. */
  public static readonly CANCER_ABBREVIATION_TO_FULL = new Map<string, string>([
    ['LGG', 'brain lower grade glioma'],
    ['BRCA', 'breast invasive carcinoma'],
    ['CESC', 'cervical & endocervical cancer'],
    ['ESCA', 'esophageal carcinoma'],
    ['HNSC', 'head & neck squamous cell carcinoma'],
    ['STAD', 'stomach adenocarcinoma'],
    ['TGCT', 'testicular germ cell tumor'],
    ['UCEC', 'uterine corpus endometrioid carcinoma'],
    ['SARC', 'sarcoma'],
  ]);

  /** Cancer type to abbreviation, mirroring #CANCER_ABBREVIATION_TO_FULL. */
  public static readonly CANCER_TYPE_TO_ABBREVIATION = new Map<string, string>([
    ['lung squamous cell carcinoma', 'LUSC'],
    ['prostate adenocarcinoma', 'PRAD'],
    ['bladder urothelial carcinoma', 'BLCA'],
    ['thyroid carcinoma', 'THCA'],
    ['lung adenocarcinoma', 'LUAD'],
    ['kidney papillary cell carcinoma', 'KIRP'],
    ['colon adenocarcinoma', 'COAD'],
    ['pancreatic adenocarcinoma', 'PAAD'],
    ['liver hepatocellular carcinoma', 'LIHC'],
    ['pheochromocytoma & paraganglioma', 'PCPG'],
    ['thymoma', 'THYM'],
    ['ovarian serous cystadenocarcinoma', 'OV'],
    ['kidney clear cell carcinoma', 'KIRC'],
    ['brain lower grade glioma', 'LGG'],
    ['breast invasive carcinoma', 'BRCA'],
    ['cervical & endocervical cancer', 'CESC'],
    ['esophageal carcinoma', 'ESCA'],
    ['head & neck squamous cell carcinoma', 'HNSC'],
    ['stomach adenocarcinoma', 'STAD'],
    ['testicular germ cell tumor', 'TGCT'],
    ['uterine corpus endometrioid carcinoma', 'UCEC'],
    ['sarcoma', 'SARC'],
  ]);

  /** Cancer Subtype Abbreviation to full name */
  public static readonly SUBTYPE_ABBREVIATION_TO_FULL = new Map<string, string>(
    [
      [
        'IDHmut-codel',
        'Isocitrate dehydrogenase mutant with 1p/19q codeletion',
      ],
      [
        'IDHmut-non-codel',
        'Isocitrate dehydrogenase mutant without 1p/19q codeletion',
      ],
      ['IDHwt', 'Isocitrate dehydrogenase wildtype'],
      ['Basal', 'Basal-like'],
      ['Her2', 'HER2-enriched'],
      ['LumA', 'Luminal A'],
      ['LumB', 'Luminal B'],
      ['CIN', 'chromosomal instability'],
      ['ESCC', 'esophageal squamous cell carcinoma'],
      ['HPV-', 'Human papillomavirus negative'],
      ['HPV+', 'Human papillomavirus positive'],
      ['DDLPS', 'Dedifferentiated liposarcoma'],
      ['LMS', 'Leiomyosarcoma'],
      ['MFS_UPS', 'undifferentiated pleomorphic sarcoma/myxofibrosarcoma'],
      ['EBV', 'Epstein-Barr virus'],
      ['GS', 'genomically stable'],
      ['MSI', 'microsatellite instability'],
      ['CN_HIGH', 'Copy number high'],
      ['CN_LOW', 'Copy number low'],
      ['POLE', 'polymerase ε'],
      ['AdenoCarcinoma', 'Adeno Carcinoma'],
      ['SquamousCarcinoma', 'Squamous Carcinoma'],
      ['seminoma', 'Seminoma'],
      ['non-seminoma', 'Non-Seminoma'],
    ]
  );

  constructor(private shared: SharedService) {
    try {
      /* Sigma configurations */
      sigma.classes.graph.addMethod('adjacentEdges', function (id) {
        if (typeof id !== 'string') {
          throw new Error('adjacentEdges: the node id must be a string.');
        }
        let a = this.allNeighborsIndex[id],
          eid,
          target,
          edges = [];
        for (target in a) {
          for (eid in a[target]) {
            edges.push(a[target][eid]);
          }
        }
        return edges;
      });
    } catch { }
  }

  network_edges;
  network_nodes;

  default_node_color = '#052444';
  default_edge_color = '#0000FF';
  subgraph_edge_color = '#339FFF'; // '#013220' //'#013220' //339FFF hellblau
  subgraph_node_color = '#008cff'; // '#920518' rot
  hover_edge_color = '#9429ff'; // <--lila  //'#ff00f6' //'#228B22' --> grüner hover
  hover_node_color = '#a95aa1';
  network_grey_edge_color = '#e0dfde';
  edge_color_pvalues_bins = {
    1: '#ffe921', // '#965a00',//'#fae4cf',
    // 0.8: '#fdbe85',
    0.4: '#ffc021', // '#ff5f29'red orange,//'#ff9900', //'#530096', lila
    0.05: '#ff9421', // '#bf8c40'//'#c94503'
  };

  // we want to mark up to 2 nodes or edges as hovered for comparison
  active_nodes = [];
  active_edges = [];

  active_kmp_plots = []; // stores ensg numbers of active kmp plots to avoid duplicates

  controller = new Controller();

  nodeIDclicked: any = 'test';

  public static uppercaseFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  public buildTable(data, table_name, column_names) {
    const table = document.createElement('table');
    table.id = table_name;
    table.className = 'table table-striped';
    table.setAttribute('style', ' text-align: center; width:100%');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const headRow = document.createElement('tr');
    column_names.forEach(function (el) {
      const th = document.createElement('th');
      if (el == 'Gene Ontology') {
        th.setAttribute('style', 'min-width:250px');
      } else if (el == 'Hallmarks') {
        th.setAttribute('style', 'min-width: 150px');
      } else if (el == 'Gene Type' || el == 'Gene Symbol') {
        // th.setAttribute("style","width: 110px;")
      } else if (el == 'GeneCard') {
        // th.setAttribute("style","width: 110px;")
      }

      // th.setAttribute("style","width: min-content;")
      th.appendChild(document.createTextNode(el));
      headRow.appendChild(th);
    });
    const $this = this;
    thead.appendChild(headRow);
    table.appendChild(thead);
    data.forEach(function (el) {
      const tr = document.createElement('tr');
      for (const o in el) {
        const td = document.createElement('td');

        td.appendChild(document.createTextNode(el[o]));
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    const container = document.createElement('div');
    container.setAttribute('class', 'container-fluid');
    //   container.setAttribute("style","width:1300px")
    container.appendChild(table);
    return container;
  }

  public buildTable_GO_HM(table_id) {
    let count = 0;

    const div = document.createElement('div');
    div.setAttribute('class', 'full-width text-center');
    const spinner = document.createElement('div');
    spinner.setAttribute('class', 'spinner-border spinner');
    div.appendChild(spinner);
    const gene_symbols = []; // list with gene names for api request

    // get table and append go and hallmark wird vor aufheben des spinners aufgehoben
    // alle gene ids holen um eine api anfrage zu machen
    const table = document.getElementById(table_id) as HTMLTableElement;

    // length of the rows. Because the tables have a diff number of elements btw gene symbol and the last element in browse and search,
    // the additional elements are appended from behind
    const x = table.rows[0].cells.length;

    for (let i = 0, row; (row = table.rows[i]); i++) {
      // iterate through rows

      for (let j = 0, col; (col = row.cells[j]); j++) {
        if (col.textContent.match('Gene Symbol')) {
          count = j;
          break;
        }
      }
    }

    // fill array for api request
    for (let i = 0, row; (row = table.rows[i]); i++) {
      const td = document.createElement('td');
      if (
        !gene_symbols.includes(row.cells[count].textContent) &&
        row.cells[count].textContent != '-' &&
        row.cells[count].textContent !== '' &&
        row.cells[count].textContent !== 'Gene Symbol'
      ) {
        gene_symbols.push(row.cells[count].textContent);
      }

      if (row.cells[x - 2].textContent == 'genecard') {
        const path = document.createElement('a');
        path.setAttribute('id', 'genecard');
        path.setAttribute('class', 'btn btn-outline-primary');

        path.setAttribute('target', '_blank');
        if (row.cells[count].textContent != '-') {
          path.setAttribute(
            'href',
            'https://www.genecards.org/cgi-bin/carddisp.pl?gene=' +
            row.cells[count].textContent
          );

          path.textContent = 'GeneCard for ' + row.cells[count].textContent;
        } else {
          path.setAttribute(
            'href',
            'https://www.genecards.org/cgi-bin/carddisp.pl?gene=' +
            row.cells[count - 1].textContent
          );

          path.textContent = 'GeneCard for ' + row.cells[count - 1].textContent;
          // td.appendChild(document.createTextNode("-"));
        }

        td.appendChild(path);
        //   $("#genecard").html("<button type='button' class='btn btn-outline-primary' onclick='location.href='#''></button>");

        row.cells[x - 2].parentNode.replaceChild(td, row.cells[x - 2]);
      }
    }

    this.controller.get_WikiPathway({
      gene_symbol: gene_symbols,
      callback: (response) => {
        // get corresponding pathway col
        for (let i = 0, row; (row = table.rows[i]); i++) {
          // iterate through rows
          const col = row.cells[x - 3];

          const td = document.createElement('td');

          if (col.textContent == 'pathway') {
            if (row.cells[count].textContent != '-') {
              const path = document.createElement('a');
              if (response.length > 0) {
                // get entries for the gene symbol of the current col
                for (const entry of response) {
                  if (entry.gene.gene_symbol == row.cells[count].textContent) {
                    path.setAttribute('id', 'pathway');
                    path.setAttribute('class', 'btn btn-outline-primary');

                    path.setAttribute(
                      'href',
                      'https://www.wikipathways.org/index.php?query=' +
                      entry.gene.gene_symbol +
                      '&species=Homo+sapiens&title=Special%3ASearchPathways&doSearch=1&ids=&codes=&type=query'
                    );
                    path.setAttribute('value', 'Pathway');
                    path.setAttribute('target', '_blank');
                    path.textContent = 'WikiPathways';
                  }
                }
              }

              if (path.textContent == '') {
                path.textContent = '-';
              }

              td.appendChild(path);

              col.parentNode.replaceChild(td, col);
            } else {
              td.appendChild(document.createTextNode('-'));
              col.parentNode.replaceChild(td, col);
            }
          }
        }
      },
      error: (err) => {
        // if the response is empty because all gene names are -
        for (let i = 0, row; (row = table.rows[i]); i++) {
          // iterate through rows
          const tr = document.createElement('tr');
          const col = row.cells[x - 3];

          const td = document.createElement('td');

          if (col.textContent == 'pathway') {
            td.appendChild(document.createTextNode('-'));
            col.parentNode.replaceChild(td, col);
          }
        }
      },
    });

    /**Get Hallmarks and add to table */

    this.controller.get_Hallmark({
      gene_symbol: gene_symbols,
      callback: (response) => {
        // get corresponding hallmark col
        for (let i = 0, row; (row = table.rows[i]); i++) {
          // iterate through rows
          const tr = document.createElement('tr');

          const col = row.cells[x - 4];
          const td = document.createElement('td');

          if (col.textContent == 'hallmark') {
            if (row.cells[count].textContent != '-') {
              const hallmark = document.createElement('p');
              hallmark.setAttribute(
                'id',
                'hallmark' + row.cells[1].textContent
              );

              let hallmark_string = '';
              if (response.length > 0) {
                // get entries for the gene symbol of the current col
                for (const entry of response) {
                  if (entry.gene.gene_symbol == row.cells[count].textContent) {
                    hallmark_string += entry.hallmark + ', ';
                  }
                }
              }

              if (hallmark_string != '') {
                hallmark.textContent = hallmark_string.slice(0, -2);
              } else {
                hallmark.textContent = '-';
              }
              td.appendChild(hallmark);
              col.parentNode.replaceChild(td, col);

              //  div.parentNode.replaceChild(hallmark, div);
            } else {
              td.appendChild(document.createTextNode('-'));
              col.parentNode.replaceChild(td, col);
            }
          }
        }
      },
      error: (err) => {
        // if the respose is empty because all gene names are -

        for (let i = 0, row; (row = table.rows[i]); i++) {
          // iterate through rows
          const tr = document.createElement('tr');
          const col = row.cells[x - 4];

          const td = document.createElement('td');

          if (col.textContent == 'hallmark') {
            td.appendChild(document.createTextNode('-'));
            col.parentNode.replaceChild(td, col);
          }

          // hallmark.textContent = err
        }
      },
    });

    /**
     * Get GO numbers
     */

    this.controller.get_GO({
      gene_symbol: gene_symbols,
      callback: (response) => {
        for (let i = 0, row; (row = table.rows[i]); i++) {
          const tr = document.createElement('tr');
          const col = row.cells[x - 1];

          const td = document.createElement('td');
          if (col.textContent == 'go') {
            if (row.cells[count].textContent != '-') {
              let button_count = 1; // if more than 12 go buttons exist, the show more button is used data-toggle="collapse"
              const go_button = document.createElement('a');
              go_button.setAttribute('id', 'show_more');
              go_button.setAttribute('class', 'btn btn-outline-primary');

              go_button.setAttribute('data-toggle', 'collapse');
              go_button.setAttribute('style', 'margin:10px');
              go_button.textContent = 'Show more';
              go_button.setAttribute(
                'data-target',
                '#collapseButtons' + row.cells[count].textContent
              );
              go_button.setAttribute('aria-expanded', 'false');
              go_button.setAttribute('aria-controls', 'collapseButtons');

              const go_div = document.createElement('div');
              go_div.setAttribute('class', 'collapse');
              go_div.setAttribute(
                'id',
                'collapseButtons' + row.cells[count].textContent
              );

              // button generieren
              if (response.length > 0) {
                for (const entry of response) {
                  if (entry.gene.gene_symbol == row.cells[count].textContent) {
                    const go = document.createElement('a');
                    go.setAttribute('id', 'go');
                    go.setAttribute('class', 'btn btn-outline-primary mr-2');
                    go.setAttribute('title', 'GO Description');
                    go.setAttribute('target', '_blank');
                    go.setAttribute(
                      'href',
                      'https://www.ebi.ac.uk/QuickGO/term/' +
                      entry.gene_ontology_symbol
                    );
                    go.setAttribute('data-toggle', 'tooltip');
                    go.setAttribute('data-placement', 'right');
                    // hover text
                    go.setAttribute('title', entry.description);
                    go.textContent = entry.gene_ontology_symbol;

                    if (button_count < 5) {
                      td.appendChild(go);
                    } else {
                      go_div.appendChild(go);
                    }

                    button_count++;
                  }
                  if (button_count > 4) {
                    td.appendChild(go_div);
                    td.appendChild(go_button);
                  }
                }
                if (
                  td.textContent == null ||
                  td.textContent == '' ||
                  td.textContent == 'go'
                ) {
                  const go = document.createElement('a');
                  go.setAttribute('id', 'go' + row.cells[0].textContent);
                  go.textContent = '-';
                  td.appendChild(go);
                }

                col.parentNode.replaceChild(td, col);
              }
            } else {
              td.appendChild(document.createTextNode('-'));
              col.parentNode.replaceChild(td, col);
            }
          }
        }
      },
      error: (err) => {
        for (let i = 0, row; (row = table.rows[i]); i++) {
          const tr = document.createElement('tr');
          const col = row.cells[x - 1];

          const td = document.createElement('td');

          if (col.textContent == 'go') {
            td.appendChild(document.createTextNode('-'));
            col.parentNode.replaceChild(td, col);
          }

          // hallmark.textContent = err
        }
      },
    });
    return table;
  }

  public colSearch(datatable_id, table, first_col_hidden = false) {
    let s;
    if (first_col_hidden) {
      s = 1;
    } else {
      s = 0;
    }
    const $this = this;
    // setup for colsearch
    $('#' + datatable_id + ' thead tr')
      .clone(true)
      .appendTo('#' + datatable_id + ' thead');
    $('#' + datatable_id + ' thead tr:eq(1) th').unbind();
    $('#' + datatable_id + ' thead tr:eq(1) th').each(function (i) {
      i = i + s;
      const title = $(this).text();
      $(this).html('<input type="text" placeholder="Search ' + title + '" />');

      $('input', this).on('keyup change', function () {
        if (table.column(i).search() !== this.value) {
          table.column(i).search(this.value).draw();
        }
        $this.buildTable_GO_HM(datatable_id);
      });
    });
  }

  public msg(msg, error = false, close_callback = undefined) {
    let overlay;
    if (error) {
      overlay = $('#error_overlay');
      $('#error_overlay_msg').text(msg);
    } else {
      overlay = $('#msg_overlay');
      $('#msg_overlay_msg').text(msg);
    }
    overlay.modal('show');
    overlay.find('.close').unbind();
    overlay.find('.close').click(() => {
      overlay.modal('hide');
      if (close_callback != undefined) {
        close_callback();
      }
    });
  }

  public getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  public load_heatmap(disease, nodes) {
    $('#heatmap_placeholder').removeClass('hidden');
    this.controller.get_expression_ceRNA({
      disease_name: disease,
      ensg_number: nodes,
      callback: (response) => {
        const z = [];
        const seen_sample_ids = {};

        const name_mapper = {}; // {ensg_number : gene_symbol || ensg_number}
        // name_mapper[experiment['gene']['ensg_number']] = `${experiment['gene']['gene_symbol']} (${experiment['gene']['ensg_number']})`

        for (const e in response) {
          const experiment = response[e];

          if (experiment.gene.gene_symbol != null) {
            name_mapper[
              experiment.gene.ensg_number
            ] = `${experiment.gene.gene_symbol}`;
          } else {
            name_mapper[experiment.gene.ensg_number] =
              experiment.gene.ensg_number;
          }

          const gene = experiment.gene.ensg_number;
          const expr_value = experiment.expr_value;
          const sample_ID = experiment.sample_ID;
          if (seen_sample_ids.hasOwnProperty(sample_ID)) {
            seen_sample_ids[sample_ID][gene] = expr_value;
          } else {
            const new_obj = {};
            new_obj[gene] = expr_value;
            seen_sample_ids[sample_ID] = new_obj;
          }
        }

        const ordered_genes = nodes.sort();

        // sort genes alphabetically
        ordered_genes.forEach((ensg_number) => {
          ordered_genes[ensg_number];
        });

        for (const sample_ID in seen_sample_ids) {
          const genes_values = seen_sample_ids[sample_ID];
          const l = [];
          for (const j in Object.values(ordered_genes)) {
            const gene = ordered_genes[j];
            l.push(genes_values[gene]);
          }
          z.push(l);
        }

        const sample_names = ordered_genes.map((e) => name_mapper[e]);

        const data = [
          {
            z,
            y: Object.keys(seen_sample_ids),
            x: sample_names,
            type: 'heatmap',

            hovertemplate:
              '<br>  </br>' +
              'Expression Value: %{z}<br>' +
              'Sample-ID: %{y} <br>' +
              'Gene: %{x}<br>' +
              '<extra></extra>',
          },
        ];

        const layout = {
          title: 'Expression Heatmap - transcripts per million',
          annotations: [],
          paper_bgcolor: 'ghostwhite',
          plot_bgcolor: 'rgb(248,248,255)',
          yaxis: {
            automargin: false,
            margin: {
              l: 50,
              r: 50,
              b: 100,
              t: 100,
              pad: 4,
            },
            showticklabels: false,
            ticks: '',
            title: 'Samples',
          },
        };
        if ($('#expression_heatmap').length) {
          // element is not on page in case user changes page while loading, we just prevent throwing an error
          Plotly.newPlot('expression_heatmap', data, layout);
          $('#expression_heatmap_container_background').removeClass('hidden');
        }
        $('#heatmap_placeholder').addClass('hidden');
      },
      error: () => {
        // this.msg("Something went wrong loading the expression data.", true)
      },
    });
  }

  public destroy_KMPs() {
    $('#KMP-plot-container-parent #plots').empty();
    this.active_kmp_plots = [];
  }

  public load_KMP(ensgList, clicked_Node, disease_name) {
    // start loading data
    $('#loading_spinner_KMP').removeClass('hidden');

    let dn = $('#disease_selectpicker').val().toString();

    if (dn == 'All') {
      dn = encodeURIComponent($('#network-plot-container').val().toString());
    }

    // Rauslöschen des KMP-Plots wenn Node deselected wird
    if ($('#myDiv_' + clicked_Node).length > 0) {
      $('#myDiv_' + clicked_Node).remove();
      this.active_kmp_plots.splice(this.active_kmp_plots.indexOf(clicked_Node));
      $('#loading_spinner_KMP').addClass('hidden');
    }

    for (let $o = 0; $o < ensgList.length; $o++) {
      const overexpression_0 = [];
      const overexpression_1 = [];
      let mean_se = [];
      let overexpression_0_se = [];
      let overexpression_1_se = [];
      const seen_time_mean = [];
      const seen_time_0 = [];
      const seen_time_1 = [];

      if ($('#myDiv_' + ensgList[$o]).length <= 0) {
        this.controller.get_survival_rates({
          disease_name: dn,
          ensg_number: [ensgList[$o]],

          callback: (response) => {
            if (this.active_kmp_plots.includes(response[0].gene.ensg_number)) {
              // skip if duplicate, we created the plot due to other function call in the meanwhile.
              // this is not optimal but sufficient solution for now
              return;
            } else {
              // add ens number to list so we know it is currently active
              this.active_kmp_plots.push(response[0].gene.ensg_number);
            }

            mean_se = this.parse_survival_data(response, seen_time_mean);

            for (let j = 0; j < response.length; j++) {
              if (response[j].overexpression == 0) {
                overexpression_0.push(response[j]);
              } else {
                overexpression_1.push(response[j]);
              }
            }

            overexpression_1_se = this.parse_survival_data(
              overexpression_1,
              seen_time_1
            );
            overexpression_0_se = this.parse_survival_data(
              overexpression_0,
              seen_time_0
            );
            let add_KMP_Plot;
            /*  if(response[0].gene.gene_symbol != 'null'){
               add_KMP_Plot =  "<div class='col-auto' id='myDiv_"+response[0].gene.gene_symbol +"'style='min-height:410px; min-width:510px; background-color:white; margin:10px; border: solid 3px #023f75; border-radius: 10px;'></div> "
              }else{*/
            add_KMP_Plot =
              "<div class='col-auto' id='myDiv_" +
              response[0].gene.ensg_number +
              "'style='min-height:410px; min-width:510px; background-color:white; margin:10px; border: solid 2px #136fe2; border-radius: 10px;'></div> ";

            //   }
            //          let add_KMP_Plot =  "<div class='col justify-content-md-center' id='kmp-plot-container' style='background-color:white;margin:10px; border: solid 3px #023f75; border-radius: 10px;'>"+"<div id='myDiv_"+response[0].gene +"'style='left:50%;'></div> "+"</div>"
            $('#plots').append(add_KMP_Plot);
            if (
              dn ==
              encodeURIComponent($('#network-plot-container').val().toString())
            ) {
              dn = $('#network-plot-container').val().toString();
            }

            this.plot_KMP(
              mean_se,
              overexpression_0_se,
              overexpression_1_se,
              seen_time_mean,
              seen_time_1,
              seen_time_0,
              response[0],
              dn
            );

            // end loading
            $('#loading_spinner_KMP').addClass('hidden');

            // show KMP
            if ($('#plots').hasClass('hidden')) {
              $('#plots').removeClass('hidden');
            }
          },
          error: (repsonse) => {
            // this.msg("Something went wrong creating the survival analysis.", true)
            $('#loading_spinner_KMP').addClass('hidden');
          },
        });
      }
    }
  }

  // 1. mit /survivalAnalysis/getRates das gen anhängen aus dem json die survival rate id holen und damit
  // für jdn eintrag /survivalAnalysis/sampleInformation holenund dann die konfidenz intervalle u log rank plot
  // außerdem zusätzlicher knopf um gen auszu wählen u dafür plots zu machen

  // Funktion noch mal für overexpression:0 und overexpression:1
  parse_survival_data(response, seen_time) {
    const samples = [];

    const allResp = JSON.stringify(response);
    const allResp2 = JSON.parse(allResp);

    for (let i = 0; i < allResp2.length; i++) {
      // rausziehen der patienten info
      // Gleich berechnen des SE u speichern des ergebnisses in array mit sample id u (gene)//
      // Dafür abspeichern des JSon in seperaten array damit man eins zum durchsuchen hat und eins zum abarbeiten
      samples.push(allResp2[i]);
    }
    // Sortieren nach der survival time
    samples.sort((a, b) =>
      a.patient_information.survival_time > b.patient_information.survival_time
        ? 1
        : -1
    );
    // TO-DO sicherstellen das 1 zeit auch nur 1 mal durchgegangen wird
    const SE_array = [];
    // let seen_time =[]
    let last_estimate = 1;
    for (let i = 0; i < samples.length; i++) {
      if (
        samples[i].patient_information.survival_time != null &&
        !seen_time.includes(samples[i].patient_information.survival_time)
      ) {
        const time = samples[i].patient_information.survival_time;
        seen_time.push(time);
        //  seen_time_input.push(time);

        // alle einträge mit der time raus holen
        const censored_0 = [];
        const censored_1 = [];
        let count_time = 0;
        let bigger_equal_time = 0;
        // Durchsuchen von samples nach der zeit u zählen wie viele 0 und 1 wobei 0 ein event ist also tod
        for (let j = 0; j < samples.length; j++) {
          if (samples[j].patient_information.survival_time == time) {
            if (samples[j].patient_information.disease_status == 0) {
              censored_0.push(samples[j]);
            } else {
              censored_1.push(samples[j]);
            }
            count_time++; // wie viele insgesamt mit der time gibt es
          }
          if (samples[j].patient_information.survival_time >= time) {
            bigger_equal_time += 1;
          }
        }

        const n = censored_0.length; // hier ist ein tod eingetreten

        const estimate = last_estimate * (1 - n / bigger_equal_time);
        last_estimate = estimate;

        SE_array.push(estimate);
      }
    }

    return SE_array;
  }

  plot_KMP(
    mean_se,
    overexpression_0_se,
    overexpression_1_se,
    seen_time_mean,
    seen_time_1,
    seen_time_0,
    response,
    disease_name
  ) {
    // Plotly.purge('myDiv_'+gene_name); $('#network-plot-container').val().toString()
    let genename;
    let ensg;
    if (response.gene.gene_symbol == null) {
      ensg =
        'Survival Analysis of gene ' +
        response.gene.ensg_number +
        ' from cancer set <br>' +
        disease_name;
    } else {
      ensg =
        'Survival Analysis of gene ' +
        response.gene.gene_symbol +
        ' from cancer set <br>' +
        disease_name;
    }

    const sestimateGesamt = [];
    let pvalue;
    this.controller.get_survival_pvalue({
      disease_name,
      ensg_number: response.gene.ensg_number,
      callback: (responsePval) => {
        pvalue = JSON.stringify(responsePval[0].pValue);

        // Holen der wichtigen Daten und berechnen der Werte + speichern in trace
        // Im beispiel fall nur y estimate gegen time x
        const mean = {
          x: seen_time_mean,
          y: mean_se,
          type: 'scatter',
          name: 'Normal SE calculations',
        };

        const overexpression_0 = {
          x: seen_time_0,
          y: overexpression_0_se,
          type: 'scatter',
          name: 'Underexpressed Genes',
        };

        const overexpression_1 = {
          x: seen_time_1,
          y: overexpression_1_se,
          type: 'scatter',
          name: 'Overexpressed Genes',
        };

        const data = [overexpression_0, overexpression_1];
        const layout = {
          // autosize: false,
          //  width:480,
          // height: 400,
          // legend:{
          //   orientation:"h",
          //   y: -0.35,
          // },
          legend: {
            xanchor: 'center',
            yanchor: 'top',
            orientation: 'h',
            y: -0.35, // play with it
            x: 0.5, // play with it
          },
          annotations: [
            {
              xref: 'paper',
              yref: 'paper',
              x: 1,
              xanchor: 'left',
              y: 0.83,
              yanchor: 'top',
              text: 'p-Value: ' + pvalue,
              showarrow: false,
              textangle: -90,
              font: {
                family: 'Arial, bold',
                size: 10,
                color: 'cc0066',
              },
            },
          ],
          title: {
            text: ensg,
            font: {
              family: 'Arial, bold',
              size: 14,
              color: '#052444',
            },
          },
          xaxis: {
            title: 'Duration (Days)',
            autorange: true,
            hoverformat: '.3f',
          },
          yaxis: {
            title: 'Survival Rate',
            autorange: true,
            hoverformat: '.3f',
          },
          hoverlabel: {
            namelength: 50,
          },
        };
        Plotly.plot('myDiv_' + response.gene.ensg_number, data, layout, {
          showSendToCloud: true,
        });
      },
    });
  }
  public choose_edge_color(value) {
    let color = this.default_edge_color;
    for (const step in this.edge_color_pvalues_bins) {
      if (value <= step) {
        color = this.edge_color_pvalues_bins[step];
      }
    }
    return color;
  }

  public async make_network(
    selected_disease,
    nodes,
    edges,
    node_table = null,
    edge_table = null
  ) {
    this.network_edges = edges;
    this.network_nodes = nodes;

    const $this = this;
    $('#network-plot-container').html(''); // clear possible other network
    $('#network-search').html(''); // clear other search options

    if (nodes.length === 0) {
      // we only get here when we search for specific genes and then changed the disease to a disease where there is no data for these genes
      $('#network-plot-container').html(
        '<p style="margin-top:150px">No data was found for your search parameters or search genes.</p>'
      );
      return null;
    }

    $('#network-search').html(
      "<select id='network_search_node' class='form-control-md mr-sm-2' data-live-search='true' show-subtext='true'></select>" +
      "<button id='network_search_node_button' class='btn btn-sm btn-secondary' >Search</button>"
    );
    let node_options = ''; // for node selector
    for (const node in nodes) {
      const label = nodes[node].label;
      const id = nodes[node].id;
      node_options += '<option data-subtext=' + label + '>' + id + '</option>';
    }
    // append options to search-dropdown for network
    $('#network_search_node').append(node_options);

    let edge_options = ''; // for network search selector
    for (const edge in edges) {
      const source = edges[edge].source;
      const target = edges[edge].target;
      const id = edges[edge].id;
      edge_options +=
        '<option data-subtext=' +
        source +
        ',' +
        target +
        '>' +
        id +
        '</option>';
    }
    // append options to search-dropdown for network
    $('#network_search_node').append(edge_options);

    $('#network_search_node').selectpicker();

    const graph = {
      nodes,
      edges,
    };

    const network = new sigma({
      graph,
      renderer: {
        container: document.getElementById('network-plot-container'),
        type: 'canvas',
      },
      settings: {
        minEdgeSize: 0.8,
        maxEdgeSize: 4,
        minNodeSize: 1,
        maxNodeSize: 10,
        defaultNodeColor: this.default_node_color,
        autoRescale: ['nodePosition', 'edgeSize'], // 'edgeSize', nodeSize, nodePosition
        animationsTime: 1000,
        borderSize: 1.5,
        outerBorderSize: 1.5,
        enableEdgeHovering: true,
        edgeHoverColor: this.default_edge_color, // just make edges bigger on hover, change color on click
        defaultEdgeHoverColor: this.default_edge_color, // '#2ecc71', helles grün
        edgeHoverSizeRatio: 1.5,
        nodeHoverSizeRatio: 1.5,
        edgeHoverExtremities: true,
        scalingMode: 'outside',
        doubleClickEnabled: true,
        labelThreshold: 0,
      },
    });
    $('#network_graph_placeholder').addClass('hidden');

    const session = new Session(network, this.shared);

    const noverlap_config = {
      nodeMargin: 3.0,
      scaleNodes: 1.3,
    };

    // Configure the algorithm
    const noverlap_listener = network.configNoverlap(noverlap_config);
    network.startNoverlap();

    network.addCamera('cam1');

    // network.bind('outNode', (e) => {
    //   // hide node information
    //   if (!$('#node_information').hasClass('hidden')) {
    //     $('#node_information').addClass('hidden')
    //   }
    // })

    network.bind('overNode', (e) => {
      // events: overNode outNode clickNode doubleClickNode rightClickNode
      // e.data.node.color = $this.hover_node_color
      // load the node information for window on the side
    });

    // network.bind('outEdge', (e) => {
    //   // hide edge information
    //   if (!$('#edge_information').hasClass('hidden')) {
    //     $('#edge_information').addClass('hidden')
    //   }
    // })

    network.bind('clickEdge', (e) =>
      this.clickEdgeListener(e, selected_disease, network)
    );

    // network.bind('outEdge', (ee) => {
    //   ee.data.edge.color = this.default_edge_color
    // })

    network.bind('doubleClickNode', (e) => {
      nodeDoubleClick(e);
    });

    let clickNode_clicked = false;
    network.bind('clickNode', (e) => {
      if (clickNode_clicked == false) {
        nodeSingleClick(e);
        clickNode_clicked = true;
        setTimeout(() => {
          clickNode_clicked = false;
        }, 500);
      }
    });

    function nodeDoubleClick(e) {
      // $this.clear_colors(network)
      $this.grey_edges(network);

      const nodeId = e.data.node.id;
      network.graph.adjacentEdges(nodeId).forEach((ee) => {
        ee.color = $this.subgraph_edge_color;
      });
      // set node color to clicked
      e.data.node.color = $this.subgraph_node_color;

      // mark node in node_table
      if (node_table) {
        $this.mark_nodes_table(node_table, e.data.node.id);
      }
      // mark edges in edge_table
      if (edge_table) {
        const edges = network.graph
          .adjacentEdges(nodeId)
          .map((ee) => String(ee.id));
        $this.mark_edges_table(edge_table, edges);
      }

      network.refresh();

      // network was altered, update url
      session.update_url();
    }

    function nodeSingleClick(e) {
      /*
      marks the node as clicked (by color)
      loads KMP plot for node
      */
      const nodeId = e.data.node.id;

      // set node color
      if (e.data.node.color != $this.subgraph_node_color) {
        e.data.node.color = $this.subgraph_node_color;
        // mark node in table
        if (node_table) {
          $this.mark_nodes_table(node_table, nodeId);
        }
      } else {
        e.data.node.color = $this.default_node_color;
        // unmark node in table
        if (node_table) {
          $this.unmark_nodes_table(node_table, nodeId);
        }
      }
      network.refresh();

      $this.node_is_clicked(nodeId);

      // network was altered, update url
      session.update_url();

      // load KMP
      $this.load_KMP(session.get_selected().nodes, nodeId, selected_disease);

      // remove data if node was unselected
      if ($(`#node_information_content .${e.data.node.id}`).length) {
        $(`#node_information_content .${e.data.node.id}`).remove();
      } else {
        // show information for clicked node
        const data = JSON.parse($('#node_data').text());
        for (const entry in data) {
          if (data[entry]['ENSG Number'] == e.data.node.id) {
            // build a table to display json
            let table = `<table class='table table-striped table-hover'>`;
            for (const attribute in data[entry]) {
              if (
                !(
                  attribute == 'Hallmarks' ||
                  attribute == 'Gene Ontology' ||
                  attribute == 'GeneCard' ||
                  attribute == 'Pathway'
                )
              ) {
                let row = '<tr>';
                row += '<td>' + attribute + ': </td>';
                row += '<td>' + data[entry][attribute] + '</td>';
                row += '</tr>';
                table += row;
              }
            }
            table += '</table>';

            $('#node_information_content').append(
              `<div class="card ${e.data.node.id}">
                <div class="card-body">
                  ${table}
                </div>
              </div>`
            );
          }
        }
      }
      // unhide node information
      if ($('#node_information').hasClass('hidden')) {
        $('#node_information').removeClass('hidden');
      }
      // hide edge information
      if (!$('#edge_information').hasClass('hidden')) {
        $('#edge_information').addClass('hidden');
      }
    }

    function searchNode(node_as_string) {
      /*
      Searches for a given node-string "ENSG..." in the network and returns the node object
      */
      const nodes = network.graph.nodes();
      let node;
      for (node in nodes) {
        if (
          nodes[node].id == node_as_string ||
          nodes[node].label == node_as_string
        ) {
          break;
        }
      }

      return nodes[node];
    }

    function searchEdge(edge_as_string) {
      /*
      Searches for a given edge-id in the network and returns the edge object
      */
      const edges = network.graph.edges();
      let edge;
      for (edge in edges) {
        if (
          edges[edge].id == edge_as_string ||
          edges[edge].label == edge_as_string
        ) {
          break;
        }
      }
      return edges[edge];
    }

    function focusNode(node_as_string) {
      /*
      This function is used to show one node in the network.
      The camera moves to center the given node-string "ENSG..." and the node gets marked.
      Afterwards, the node gets also marked in the node_table.
      */
      const camera = network.cameras[0];
      const node = searchNode(node_as_string);
      node.color = $this.subgraph_node_color;

      // load KMP
      $this.load_KMP(session.get_selected().nodes, node.id, selected_disease);

      sigma.misc.animation.camera(
        camera,
        {
          x: node['read_cam0:x'],
          y: node['read_cam0:y'],
          ratio: 1,
        },
        {
          duration: 300,
        }
      );

      // setTimeout( () => {
      //   node.hover()
      // }, 400)
      // mark node in node table
      if (node_table) {
        $this.mark_nodes_table(node_table, node_as_string);
      }
    }

    function focusEdge(edge_as_string) {
      /*
      This function is used to show one edge in the network.
      The camera moves to center the given edge-string and the edge gets marked.
      Afterwards, the edge gets also marked in the edge_table.

      Returns network and corresponding session
      */
      const camera = network.cameras[0];
      const edge = searchEdge(edge_as_string);
      const source = searchNode(edge.source);
      const target = searchNode(edge.target);

      const x = (source['read_cam0:x'] + target['read_cam0:x']) / 2;
      const y = (source['read_cam0:y'] + target['read_cam0:y']) / 2;

      edge.color = $this.subgraph_edge_color;
      sigma.misc.animation.camera(
        camera,
        {
          x: Number(x.toFixed()),
          y: Number(y.toFixed()),
          ratio: 1,
        },
        {
          duration: 300,
        }
      );
      // mark edge in edge table
      if (edge_table) {
        $this.mark_edges_table(edge_table, edge_as_string);
      }
    }

    function removeEdge(id) {
      network.graph.edges().forEach((ee) => {
        if (ee.id == id) {
          network.graph.dropEdge(ee.id);
          // ee.hidden = true
        }
      });
      network.refresh();
    }

    $('#network_search_node_button').unbind();
    $('#network_search_node_button').click(() => {
      const to_search = $('#network_search_node').val();

      if (to_search === null) {
        // empty network
        return;
      }

      if (to_search.startsWith('ENSG')) {
        focusNode(to_search);
      } else {
        focusEdge(to_search);
      }
    });

    /* Save network button */
    $('#network_snapshot_png').unbind();
    $('#network_snapshot_png').on('click', () => {
      network.renderers[0].snapshot({
        format: 'png',
        background: 'white',
        filename: 'SPONGE_' + selected_disease + '_graph.png',
        labels: true,
        download: true,
      });
    });

    $('#network_snapshot_jpg').unbind();
    $('#network_snapshot_jpg').on('click', () => {
      network.renderers[0].snapshot({
        format: 'jpg',
        background: 'white',
        filename: 'SPONGE_' + selected_disease + '_graph.jpg',
        labels: true,
        download: true,
        data: true,
      });
    });

    // $('#network_snapshot_svg').on('click', () => {
    //   network.toSVG({
    //     download: true,
    //     filename: 'SPONGE_'+selected_disease+'_graph.svg',
    //     labels: true,
    //     size: 1000,
    //     width: 1000,
    //     height: 1000,
    //     data: true
    //   })
    // })

    /* restart camera */
    $('#restart_camera').unbind();
    document
      .getElementById('restart_camera')
      .addEventListener('click', function () {
        network.camera.goTo({
          x: 0,
          y: 0,
          angle: 0,
          ratio: 2,
        });
      });

    /* toggle force atlas 2 */
    $('#toggle_layout').unbind();
    $('#toggle_layout').click(() => {
      if ((network.supervisor || {}).running) {
        network.killForceAtlas2();
        // document.getElementById('toggle_layout').innerHTML = 'Start layout';
      } else {
        const config = {
          // algorithm config
          linLogMode: false,
          outboundAttractionDistribution: true,
          adjustSizes: false,
          edgeWeightInfluence: 1,
          scalingRatio: 1,
          strongGravityMode: true,
          gravity: 1, // attracts nodes to the center. Prevents islands from drifting away
          barnesHutOptimize: false,
          barnesHutTheta: 0.5,
          slowDown: 5,
          startingIterations: 1,
          iterationsPerRender: 1,

          // Supervisor config
          worker: true,
        };

        network.startForceAtlas2(config);

        // document.getElementById('toggle_layout').innerHTML = 'Stop layout';
        $('#toggle_layout').attr('disabled', true);

        setTimeout(function () {
          $('#toggle_layout').attr('disabled', false);
          $('#toggle_layout').click();
        }, 2000);
      }
    });

    $('#reset_graph').unbind();
    $('#reset_graph').click(() => {
      this.clear_colors(network);
      $('#node_information_content').empty();
      $('#edge_information_content').empty();
      if (node_table) {
        this.clear_table(node_table);
      } // no node table in search
      if (edge_table) {
        this.clear_table(edge_table);
      } // no edge table in search
      session.update_url();
    });

    // Initialize the dragNodes plugin:
    // var dragListener = sigma.plugins.dragNodes(network, network.renderers[0]);

    // zoom out
    $('#restart_camera').click();
    // network.refresh()

    // build legend
    const legend = $(
      '<table style="border-right: #136fe2 2px solid;border-bottom: #136fe2 2px solid; border-radius: 10px 0px 5px; border-collapse: separate;">'
    )
      .addClass('table-sm table-striped text-center')
      .attr('id', 'network-legend');
    // append header
    // legend.html(`<tr><th>Color</th><th>p-value</th></tr>`)
    // append rows
    legend.append('<th style="position: relative;left: 25%;">Legend</th>');

    for (const [threshold, color] of Object.entries(
      this.edge_color_pvalues_bins
    )) {
      const row = $('<tr>');
      row.append(
        $('<td>').append(
          $('<span>').addClass('legend-line').css('background-color', color)
        )
      );
      row.append($('<td>').text('p-value <= ' + threshold));
      legend.append(row);
    }

    legend.append(`
        <tr width="30px">
          <td>
            <span class='legend-dot-small'></span>
            <span class='legend-dot-middle'></span>
            <span class='legend-dot-big'></span>
          </td>
          <td>
            Degree
          </td>
        </tr>
      `);
    /** legend.append(`
       <tr>
         <td>
           <span class='legend-dot-big'></span>
         </td>
         <td>
           high Degree
         </td>
       </tr>
     `) */

    //  $('#network_legend').html(legend)
    $('#network-legend').html(legend);

    return { network, session };
  }
  private async clickEdgeListener(e, selected_disease, network) {
    const data = JSON.parse($('#edge_data').text());
    const edge = e.data.edge;

    if ($(`#edge_information_content .${edge.id}`).length) {
      // reset edge color
      edge.color = this.choose_edge_color(
        data.find((x) => x.ID.toString() == edge.id)['adjusted p-value']
      );
      $(`#edge_information_content .${edge.id}`).remove();
    } else {
      edge.color = this.hover_edge_color;
      const entry = data.find((x) => x.ID.toString() === edge.id);
      if (entry) {
        // build a table to display json
        let table = `<table class='table table-striped table-hover '>`;
        for (const attribute in entry) {
          if (attribute === 'miRNAs') {
            continue;
          }
          table += `
          <tr>
            <td>${attribute}: </td>
            <td>${entry[attribute]} ${(attribute.startsWith('Gene')) ? '<button type="button" data-ensg="' + entry[attribute] + '" class="btn btn-primary openIGV ' + entry[attribute] +'" > open IGV </button>' : ''}</td>
          </tr>
        `;
        }

        // loading spinner for mirna
        const id = entry['Gene 1'] + '_' + entry['Gene 2'];
        table += `
        <tr>
          <td>miRNAs: </td>
          <td class="mirna-entry" id="${id}">
            <div class="spinner-border spinner"></div>
          </td>
        </tr>
      `;

        table += '</table>';

        $('#edge_information_content').append(
          `<div class="card ${edge.id}">
          <div class="card-body">
            ${table}
          </div>
        </div>`
        );


        // load and append mirna data
        const mirnas = {};
        await this.controller.get_miRNA_by_ceRNA({
          disease_name: selected_disease,
          ensg_number: [entry['Gene 1'], entry['Gene 2']],
          between: true,
          callback: (response) => {
            // there can be duplicates
            for (const entry of response) {
              mirnas[`${entry.mirna.hs_nr} (${entry.mirna.mir_ID})`] = true;
            }

            let mirnas_string = '';
            for (const entry of Object.keys(mirnas)) {
              mirnas_string += entry + '<br />';
            }

            $('#edge_information #' + id).html(mirnas_string);
          },
          error: () => {
            $('#edge_information #' + id).html('-');
          },
        });

        // add function to last button with class 'openIGV'
        $(document).on('click', `#edge_information_content .${edge.id} .openIGV.${entry['Gene 1']}`, () => {
          // open IGV with miRNA data
          const hsaList: string[] = Object.keys(mirnas as any).map((x) => x.split(' ')[0]);
          // get value from clicked button
          const gene = entry['Gene 1'];
          const igvInput: IGVInput = {
            gene,
            hsaList,
          };
          this.shared.pushIgvInput(igvInput);
        });

        // add function to last button with class 'openIGV'
        $(document).on('click', `#edge_information_content .${edge.id} .openIGV.${entry['Gene 2']}`, () => {
          // open IGV with miRNA data
          const hsaList: string[] = Object.keys(mirnas as any).map((x) => x.split(' ')[0]);
          // get value from clicked button
          const gene = entry['Gene 2'];
          const igvInput: IGVInput = {
            gene,
            hsaList,
          };
          this.shared.pushIgvInput(igvInput);
        });
      }
    }
    // unhide edge information
    if ($('#edge_information').hasClass('hidden')) {
      $('#edge_information').removeClass('hidden');
    }

    // hide node information
    if (!$('#node_information').hasClass('hidden')) {
      $('#node_information').addClass('hidden');
    }
    network.refresh();
  }
  public node_is_clicked(nodeID) {
    this.nodeIDclicked = nodeID;
  }
  public node_clicked() {
    return this.nodeIDclicked;
  }

  public grey_edges(network) {
    network.graph.edges().forEach((ee) => {
      ee.color = this.network_grey_edge_color;
    });
  }

  public clear_colors(network) {
    // load edge elements to find out p value, color edges based on p value
    const data = JSON.parse($('#edge_data').text());
    network.graph.edges().forEach((ee) => {
      for (const edge of data) {
        if (edge.ID == ee.id) {
          ee.color = this.choose_edge_color(edge['adjusted p-value']);
          break;
        }
      }
    });
    network.graph.nodes().forEach((node) => {
      node.color = this.default_node_color;
    });
    network.refresh();

    // also remove all KMP plots
    this.destroy_KMPs();
  }

  public clear_table(table) {
    table.rows().every(function (rowIdx, tableLoop, rowLoop) {
      if ($(this.node()).hasClass('selected')) {
        $(this.node()).removeClass('selected');
      }
    });
  }

  public mark_nodes_table(table, nodes: string[]) {
    table.rows().every(function (rowIdx, tableLoop, rowLoop) {
      if (nodes.length && nodes.includes(this.data()[0])) {
        if (!$(this.node()).hasClass('selected')) {
          $(this.node()).addClass('selected');
        }
      }
    });
  }

  public unmark_nodes_table(table, nodes: string[]) {
    table.rows().every(function (rowIdx, tableLoop, rowLoop) {
      if (nodes.length && nodes.includes(this.data()[0])) {
        if ($(this.node()).hasClass('selected')) {
          $(this.node()).removeClass('selected');
        }
      }
    });
  }

  public mark_edges_table(table, edges: string[]) {
    table.rows().every(function (rowIdx, tableLoop, rowLoop) {
      if (edges.length && edges.includes(this.data()[5])) {
        $(this.node()).addClass('selected');
      }
    });
  }

  public mark_nodes_network(network, nodes: string[]) {
    network.graph.nodes().forEach((node) => {
      if (nodes.includes(node.id)) {
        node.color = this.subgraph_node_color;
      }
    });
  }

  public mark_edges_network(network, edges: string[], based_on_id = false) {
    this.grey_edges(network);
    // find selected edges in graph and mark them
    if (based_on_id) {
      network.graph.edges().forEach((ee) => {
        if (edges.includes(ee.id.toString())) {
          ee.color = this.subgraph_edge_color;
        }
      });
    } else {
      network.graph.edges().forEach((ee) => {
        const edge_nodes = [];
        edge_nodes.push(ee.source);
        edge_nodes.push(ee.target);
        for (let i = 0; i < edges.length; i++) {
          const selected_edge = edges[i];
          // 0 and 1 are gene1 and gene2
          if (
            edge_nodes.includes(selected_edge[0]) &&
            edge_nodes.includes(selected_edge[1])
          ) {
            ee.color = this.subgraph_edge_color;
            break;
          }
        }
      });
    }
  }

  public limit_edges_to(network, edge_list) {
    network.graph.edges().forEach((ee) => {
      if (edge_list.includes(ee.id.toString())) {
        ee.hidden = false;
      } else {
        ee.hidden = true;
      }
    });
    network.refresh();

    // update search in network
    $('#network-search').html(''); // clear other search options

    $('#network-search').html(
      "<select id='network_search_node' class='form-control-md mr-sm-2' data-live-search='true' show-subtext='true'></select>" +
      "<button id='network_search_node_button' class='btn btn-sm btn-secondary' >Search</button>"
    );
    let node_options = ''; // for node selector
    for (const node of this.network_nodes) {
      const label = node.label;
      const id = node.id;
      node_options += '<option data-subtext=' + label + '>' + id + '</option>';
    }
    // append options to search-dropdown for network
    $('#network_search_node').append(node_options);

    let edge_options = ''; // for network search selector
    for (const edge of this.network_edges) {
      if (edge_list.includes(edge.id.toString())) {
        const source = edge.source;
        const target = edge.target;
        const id = edge.id;
        edge_options +=
          '<option data-subtext=' +
          source +
          ',' +
          target +
          '>' +
          id +
          '</option>';
      }
    }
    // append options to search-dropdown for network
    $('#network_search_node').append(edge_options);

    $('#network_search_node').selectpicker();
  }

  public limit_nodes_to(network, node_list) {
    network.graph.nodes().forEach((node) => {
      if (node_list.includes(node.id.toString())) {
        node.hidden = false;
      } else {
        node.hidden = true;
      }
    });
    network.refresh();

    // update search in network
    $('#network-search').html(''); // clear other search options

    $('#network-search').html(
      "<select id='network_search_node' class='form-control-md mr-sm-2' data-live-search='true' show-subtext='true'></select>" +
      "<button id='network_search_node_button' class='btn btn-sm btn-secondary' >Search</button>"
    );
    let node_options = ''; // for node selector
    for (const node of this.network_nodes) {
      if (node_list.includes(node.id.toString())) {
        const label = node.label;
        const id = node.id;
        node_options +=
          '<option data-subtext=' + label + '>' + id + '</option>';
      }
    }
    // append options to search-dropdown for network
    $('#network_search_node').append(node_options);

    let edge_options = ''; // for network search selector
    for (const edge of this.network_edges) {
      const source = edge.source;
      const target = edge.target;
      const id = edge.id;
      edge_options +=
        '<option data-subtext=' +
        source +
        ',' +
        target +
        '>' +
        id +
        '</option>';
    }
    // append options to search-dropdown for network
    $('#network_search_node').append(edge_options);

    $('#network_search_node').selectpicker();
  }

  public filter_nodes_by_degree() { }

  public load_session_url(params) {
    let nodes = [],
      edges = [],
      active_cancer;
    // set options
    for (const key in params) {
      const val = params[key];
      switch (key) {
        case 'cancer': {
          $('#disease_selectpicker').val(val);
          break;
        }
        case 'limit': {
          $('#input_limit').val(val);
          break;
        }
        case 'c_eig': {
          $('#input_cutoff_eigenvector').val(val);
          break;
        }
        case 'c_deg': {
          $('#input_cutoff_degree').val(val);
          break;
        }
        case 'c_bet': {
          $('#input_cutoff_betweenness').val(val);
          break;
        }
        case 'sorting': {
          $('#run-info-select').val(val);
          break;
        }
        case 'nodes': {
          // store nodes to mark after loading plot
          nodes = val.split(',');
          break;
        }
        case 'edges': {
          // store edges to mark after loading plot
          edges = val.split(',');
          break;
        }
        case 'search_key': {
          $('#gene_search_keys').val(val);
          break;
        }
        // needed for search
        case 'active_cancer': {
          active_cancer = val;
          break;
        }
      }
    }
    return { nodes, edges, active_cancer };
  }

  public hallmark_info(gs, ensg) {
    this.controller.get_Hallmark({
      gene_symbol: [gs],
      callback: (response) => {
        /**
         * Get Hallmarks and add to table
         */

        let hallmark_string = '';

        for (const entry of response) {
          hallmark_string += entry.hallmark + ', ';
        }

        $('#hallmark' + ensg).innerHTML = hallmark_string.slice(0, -2);
      },
      error: (err) => {
        // $('#hallmark-'+ensg).html(err)
        const td = document.getElementById('#hallmark' + ensg);
        td.appendChild(document.createTextNode(err));
      },
    });
  }

  public setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
    const expires = 'expires=' + d.toUTCString();
    document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
  }

  public getCookie(cname) {
    const name = cname + '=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return '';
  }
}
