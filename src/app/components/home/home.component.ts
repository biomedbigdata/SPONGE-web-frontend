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
  
  constructor() { }

  ngOnInit() {

    const controller = new Controller()
    const helper = new Helper()

    // TODO: new popover function
    $('[data-toggle="popover_search_info"]').popover({
      trigger: 'hover', sanitize: false, sanitizeFn: content => content
    });
    
    var mRNAcsv=Plotly.d3.csv("src/assets/plotData/sponge_result_mRNA_count.csv");
    var Coorelationcsv=Plotly.d3.csv("src/assets/plotData/sponge_result_mRNA_count.csv");

    function processData(mRNAcsv, Coorelationcsv) {
      $('#spinner').removeClass('hidden')
      controller.get_overall_counts({
       
        callback: response => {
          var dnl=[]
          var interactions=[]
          var interactions_sig=[]
          var shared_mirnas=[]
          for (let e in response) {
            let disease = response[e]          
            dnl.push(disease['disease_name'].charAt(0).toUpperCase() + disease['disease_name'].slice(1))
            interactions.push(disease['count_interactions'])
            interactions_sig.push(disease['count_interactions_sign'])
            shared_mirnas.push(disease['count_shared_miRNAs'])

          }

          var miRNAs2=  {
            x: dnl,
            y: shared_mirnas,
            type: 'bar',
            name: 'Count of shared miRNAs',
            marker: {
              color: 'rgb(19,63,103)',
              opacity: 1
            }
          };

          var correlations_pred=  {
            x: dnl,
            y: interactions,
            type: 'bar',
            name: 'Count of predicted interactions',
            marker: {
              color: 'rgb(7,117,218)',
              opacity: 1
            }
          };

          var correlations_sig=  {
            x: dnl,
            y: interactions_sig,
            type: 'bar',
            name: 'Count of significant interactions',
            marker: {
             // color: 'rgb(94, 48, 201)',
              color:  'rgb(172, 27, 99)',
              opacity: 1
            }
          };
         

    var data = [miRNAs2, correlations_pred,correlations_sig];
    var layout = {
      title: 'SPONGE results for each pair of genes',
      titlefont: {
        family: 'Arial, bold',
        size: 22,
        color: '#0c253d'
      },
      xaxis: {
        tickangle: -45,
        //hoverformat: '.3f'
      },  
     // yaxis:{hoverformat: '.3f'},
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
      legend: {
        x:0,
        y:1,
        "orientation": "h"},
      hoverlabel:{
        namelength:50
      },
      
        
    };
    $('#spinner').addClass('hidden')
    Plotly.newPlot('Plot', data, layout, {showSendToCloud:true});
   
    
        },
        error: () => {
          //this.msg("Something went wrong loading the expression data.", true)
        }
      })
       
      var xmRNA=[]; var ymRNA=[]; var xCorr=[]; var yCorr=[];

      for (var i=0; i<mRNAcsv.length; i++) {
        var row = mRNAcsv[i];
        xmRNA.push( row['Cancer Type'] );
        ymRNA.push( row['Predicted mRNAs'] );
      }
      
      for (var i=0; i<Coorelationcsv.length; i++) {
      var 	row2 = Coorelationcsv [i];
        xCorr.push( row2['Cancer Type'] );
        yCorr.push( row2['Count of Correlations'] );
      }

     
    //	makePlotly( xmRNA, ymRNA );
    var miRNAs=  {
      x: ['Testicular germ cell tumor',
      'Pheochromocytoma & paraganglioma',
      'Liver hepatocellular carcinoma',
      'Thymoma',
      'Breast invasive carcinoma',
      'Sarcoma',
      'Colon adenocarcinoma',
      'Cervical & endocervical cancer',
      'Ovarian serous cystadenocarcinoma',
      'Prostate adenocarcinoma',
      'Brain lower grade glioma',
      'Esophageal carcinoma',
      'Stomach adenocarcinoma',
      'Head & neck squamous cell carcinoma',
      'Uterine corpus endometrioid carcinoma',
      'Thyroid carcinoma',
      'Lung squamous cell carcinoma',
      'Bladder urothelial carcinoma',
      'Kidney papillary cell carcinoma',
      'Kidney clear cell carcinoma',
      'Pancreatic adenocarcinoma',
      'Lung adenocarcinoma'],
      y: [49360078.0,
        29334455.0,
        48432536.0,
        44672893.0,
        64119040.0,
        33926911.0,
        40460559.0,
        39337160.0,
        37544112.0,
        94713550.0,
        49828004.0,
        39064440.0,
        49731749.0,
        61375428.0,
        22562615.0,
        65683979.0,
        42946569.0,
        40644258.0,
        67027109.0,
        67051666.0,
        38450658.0,
        61153123.0
        ],
      type: 'bar',
      name: 'Count of shared miRNAs',
      marker: {
        color: 'rgb(19,63,103)',
        opacity: 1
      }

    };
    var correlations=  {
      x: ['Testicular germ cell tumor',
      'Pheochromocytoma & paraganglioma',
      'Liver hepatocellular carcinoma',
      'Thymoma',
      'Breast invasive carcinoma',
      'Sarcoma',
      'Colon adenocarcinoma',
      'Cervical & endocervical cancer',
      'Ovarian serous cystadenocarcinoma',
      'Prostate adenocarcinoma',
      'Brain lower grade glioma',
      'Esophageal carcinoma',
      'Stomach adenocarcinoma',
      'Head & neck squamous cell carcinoma',
      'Uterine corpus endometrioid carcinoma',
      'Thyroid carcinoma',
      'Lung squamous cell carcinoma',
      'Bladder urothelial carcinoma',
      'Kidney papillary cell carcinoma',
      'Kidney clear cell carcinoma',
      'Pancreatic adenocarcinoma',
      'Lung adenocarcinoma'],
      y: [31159961,
        19538235,
        30648230,
        29918046,
        32420434,
        22388501,
        23229024,
        23610765,
        25023437,
        41520018,
        27771150,
        27284344,
        32260578,
        34348498,
        16186323,
        34799641,
        25571770,
        24624379,
        36012037,
        35536664,
        24391565,
        33146790
        ],
      type: 'bar',
      name: 'Count of predicted correlations',
      marker: {
        color: 'rgb(7,117,218)',
        opacity: 1
      }

    };

    var data = [miRNAs, correlations];
    var layout = {
      title: 'SPONGE results for each pair of genes',
      titlefont: {
        family: 'Arial, bold',
        size: 22,
        color: '#0c253d'
      },
      xaxis: {
        tickangle: -45,
        hoverformat: '.3f'
      },  
      yaxis:{hoverformat: '.3f'},
      barmode: 'group',
      autosize: false,
      width: 800,
      height: 800,
      margin: {
        l: 110,
        r: 70,
        b: 200,
        t: 100,
      
      },
      showlegend: true,
      legend: {
        x:0,
        y:1,
        "orientation": "h"},
      hoverlabel:{
        namelength:50
      },

        
    };

   // Plotly.newPlot('Plot', data, layout, {showSendToCloud:true});

    }

    processData(mRNAcsv,Coorelationcsv);

    $(document).on('click', '#home_search_key_table .close', function() {
      $(this).closest('tr').remove()
    })

    function parse_search_key_table() {
      let search_key = ''
      const ensg_numbers = $('#home_search_key_table .ensg_number')
      for (const ensg_number of ensg_numbers) {
        search_key += ensg_number.innerText +','
      }
      return search_key.slice(0,-1)  // remove last ','
    }

    /* Search function for home component */
    $('#home_search_button').click(() => {
      let search_key = parse_search_key_table()

      // check if search_key is non-empty after removing empty chars
      if (search_key.length == 0) {
        helper.msg("Please select genes in the search field.", true)
        return
      }
      console.log(search_key)
      window.open( 'search?search_key='+encodeURIComponent(search_key), '_top')
    })

    $(function() { 
      function split( val ) {
        return val.split( /,\s*/ );
      } 
      $( "#home_search" ).autocomplete({
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
              searchString: searchString,
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
                console.log(request)
              }
            })
          }
        },
        minLength: 3,
        search: function() {
          //$( this ).addClass( "loading" );
        },
        response: function() {
          //$( this ).removeClass( "loading" );
        },
        focus: function() {
          return false;
        },
         select: function( event, ui ) {
            let terms = ui.item.value.split(' ');

            if (terms[1].length && terms[1][0] == '(') {
              terms[1] = terms[1].substring(1, terms[1].length-1);
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
            )
            // reset search field
            this.value = ''
            return false;
        }
      });
    });

  }
}


