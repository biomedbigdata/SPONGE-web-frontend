import { Component, OnInit} from '@angular/core';
import { Controller } from 'src/app/control';
import { Helper } from 'src/app/helper';
declare var Plotly: any;
declare var $: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.less']
})
export class HomeComponent implements OnInit {

  /**    Sorts home plot data. */
  private static insertionSort(inputArr) {
    const length = inputArr.length;
    for (let i = 1; i < length; i++) {
      const key = inputArr[i][0];
      const key2 = inputArr[i][1];

      let j = i - 1;
      while (j >= 0 && inputArr[j][0] > key) {
        inputArr[j + 1][0] = inputArr[j][0];
        inputArr[j + 1][1] = inputArr[j][1];

        j = j - 1;
      }
      inputArr[j + 1][0] = key;
      inputArr[j + 1][1] = key2;

    }
    return inputArr;
  }

  /** For the homeplot, splits the 2D array and reverses the order. */
  private static subArray(inputArr, pos) {
    const outArr = [];
    for (let z = 0; z < inputArr.length; z++) {
      outArr.push(inputArr[z][pos]);
    }
    return outArr.reverse();
  }

  private async drawInteractionPlot(controller: Controller, helper: Helper, subtype = false): Promise<void> {
// TODO: new popover function
    $('[data-toggle="popover_search_info"]').popover({
      trigger: 'hover', sanitize: false, sanitizeFn: content => content
    });

    const mRNAcsv = Plotly.d3.csv('src/assets/plotData/sponge_result_mRNA_count.csv');
    const Coorelationcsv = Plotly.d3.csv('src/assets/plotData/sponge_result_mRNA_count.csv');
    await this.processData(controller, mRNAcsv, Coorelationcsv, subtype);
    $(document).on('click', '#home_search_key_table .close', function() {
      $(this).closest('tr').remove();
    });

    function parse_search_key_table() {
      let search_key = '';
      const ensg_numbers = $('#home_search_key_table .ensg_number');
      for (const ensg_number of ensg_numbers) {
        search_key += ensg_number.innerText + ',';
      }
      return [...new Set(search_key.slice(0, -1).split(','))];  // remove last ','
    }

    /* Search function for home component */
    $('#home_search_button').click(() => {
      const search_key = parse_search_key_table();

      // check if search_key is non-empty after removing empty chars
      if (search_key.length == 0) {
        helper.msg('Please select genes in the search field.', true);
        return;
      }

      window.open( 'search?search_key=' + encodeURIComponent(search_key.join(',')), '_top');
    });

    $(function() {
      function split( val ) {
        return val.split( /,\s*/ );
      }
      $( '#home_search' ).autocomplete({
        source: ( request, response ) => {
          const searchString = split(request.term).pop(); // only the last item in list
          // search string has to have min. length of 3
          if (searchString.length > 2) {
            // if search string is engs number, we want to wait with the search until we don't have to load ALL ensg number with sth like "ENSG00..."
            if (searchString.startsWith('ENSG')) {
              if (searchString.length < 12) {
                return;
              }
            }

            controller.search_string({
              searchString,
              callback: (data) => {
                // put all values in a list
                const values = [];
                for (const entry of data) {
                  //  we don't support seach for miRNAs
                  if ('ensg_number' in entry) {
                    const gene_symbol = entry.gene_symbol ? `(${entry.gene_symbol})` : '';
                    values.push(`${entry.ensg_number} ${gene_symbol}`);
                  }
                }
                response(values);

              },
              error: () => {

              }
            });
          }
        },
        minLength: 3,
        search() {
          // $( this ).addClass( "loading" );
        },
        response() {
          // $( this ).removeClass( "loading" );
        },
        focus() {
          return false;
        },
        select( event, ui ) {
          const terms = ui.item.value.split(' ');

          if (terms[1].length && terms[1][0] == '(') {
            terms[1] = terms[1].substring(1, terms[1].length - 1);
          }
          // append searched key to table
          $('#home_search_key_table tbody').append(
            `
              <tr>
                <td class="ensg_number">${terms[0]}</td>
                <td class="full-width">${terms[1]}</td>
                <td><button type="button" class="close" aria-label="Close"><span aria-hidden="true">&times;</span></button></td>
              </tr>
              `
          );
          // reset search field
          this.value = '';
          return false;
        }
      });
    });

  }

  private async loadDiseaseDataset(controller: Controller, isSubtype = false) {
    const cancerDatasetsDiseaseNames = [];
    const subtypeDatasetsDiseaseNames = [];
    const datasets = await controller.get_datasets();

    datasets.forEach( dataset => {
        if (dataset.disease_type === 'cancer') {
          cancerDatasetsDiseaseNames.push(dataset.disease_name);
        } else {
          subtypeDatasetsDiseaseNames.push(dataset.disease_name);
        }
      });

    if (isSubtype) {
      return subtypeDatasetsDiseaseNames;
    }
    return cancerDatasetsDiseaseNames;
  }

  private async processData(controller: Controller, mRNAcsv, Coorelationcsv, isSubtype = false) {
    $('#spinner').removeClass('hidden');
    const diseaseNames = await this.loadDiseaseDataset(controller, isSubtype);
    controller.get_overall_counts({

      callback: response => {
        let dnl = [];
        let interactions = [];
        let interactions_sig = [];
        const shared_mirnas = [];
        const sorted_interactions_sig = [];
        const sorted_interactions = [];
        let sign_tmp = [];
        let interactions_tmp = [];

        for (const j in response) {
          const disease = response[j];
          if (diseaseNames.includes(disease.disease_name)) {

            //  dnl.push(disease['disease_name'].charAt(0).toUpperCase() + disease['disease_name'].slice(1))
            //  interactions.push(disease['count_interactions'])
            //  interactions_sig.push(disease['count_interactions_sign'])
            shared_mirnas.push(disease.count_shared_miRNAs);
            sorted_interactions_sig.push([disease.count_interactions_sign, disease.disease_name.charAt(0).toUpperCase() + disease.disease_name.slice(1)]);
            sorted_interactions.push([disease.count_interactions, disease.disease_name.charAt(0).toUpperCase() + disease.disease_name.slice(1)]);
          }
        }


        sign_tmp = HomeComponent.insertionSort(sorted_interactions_sig);
        interactions_tmp = HomeComponent.insertionSort(sorted_interactions);
        interactions_sig = HomeComponent.subArray(sign_tmp, 0);
        interactions = HomeComponent.subArray(interactions_tmp, 0);
        dnl = HomeComponent.subArray(sign_tmp, 1);
        const dnl_insig = HomeComponent.subArray(interactions_tmp, 1);


        const miRNAs2 =  {
          x: dnl,
          y: shared_mirnas,
          type: 'bar',
          name: 'Count of shared miRNAs',
          marker: {
            color: 'rgb(19,63,103)',
            opacity: 1
          }
        };

        const correlations_pred =  {
          x: dnl_insig,
          y: interactions,
          type: 'bar',
          visible: 'legendonly',
          name: 'Count of predicted interactions',
          marker: {
            color: 'rgb(7,117,218)',
            opacity: 1
          }
        };

        const correlations_sig =  {
          x: dnl,
          y: interactions_sig,
          type: 'bar',
          name: 'Count of significant interactions',
          marker: {
            color:  'rgb(19,63,103)', // 'rgb(172, 27, 99)', nice pink
            opacity: 1
          }
        };


        const data = [correlations_pred, correlations_sig];
        let title = 'SPONGE results of main cancer types';
        if (isSubtype) {
          title = 'SPONGE results of cancer subtype specific ceRNA networks';
        }
        const layout = {
          title,
          titlefont: {
            family: 'Arial, bold',
            size: 22,
            color: '#0c253d'
          },
          xaxis: {
            tickangle: -45,
            // hoverformat: '.3f'
          },
          yaxis: {type: 'log'},
          barmode: 'group',
          autosize: false,
          width: 900,
          height: 800,
          margin: {
            l: 150,
            r: 100,
            b: 200,
            t: 100,

          },
          showlegend: true,
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          legend: {
            x: 0.13,
            y: 1.04,
            orientation: 'h'},
          hoverlabel: {
            namelength: 50
          },


        };
        $('#spinner').addClass('hidden');
        let plotElementId = 'Plot_Cancer';
        if (isSubtype) {
          plotElementId = 'Plot_Cancer_Subtype';
        }
        Plotly.newPlot(plotElementId, data, layout, {showSendToCloud: true});


      },
      error: () => {
        // this.msg("Something went wrong loading the expression data.", true)
      }
    });

    const xmRNA = []; const ymRNA = []; const xCorr = []; const yCorr = [];

    for (let i = 0; i < mRNAcsv.length; i++) {
      const row = mRNAcsv[i];
      xmRNA.push( row['Cancer Type'] );
      ymRNA.push( row['Predicted mRNAs'] );
    }

    for (let i = 0; i < Coorelationcsv.length; i++) {
      const 	row2 = Coorelationcsv [i];
      xCorr.push( row2['Cancer Type'] );
      yCorr.push( row2['Count of Correlations'] );
    }
  }
  async ngOnInit() {

    const controller = new Controller();
    const helper = new Helper();

    await this.drawInteractionPlot(controller, helper, false);
    await this.drawInteractionPlot(controller, helper, true);

  }
}


