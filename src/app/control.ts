import * as $ from "jquery";
import { ConditionalExpr } from '@angular/compiler';
import { resolve } from 'dns';
import { rejects } from 'assert';

export class Controller {

    static API_ENDPOINT: string;

    constructor() {

        if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {

            Controller.API_ENDPOINT = "https://exbio.wzw.tum.de/sponge-api"

        } else {

            Controller.API_ENDPOINT = window.location.origin+"/sponge-api"
        }
    }

    static CERNA_INTERACTION_FINDALL = "/ceRNAInteraction/findAll"
    static CERNA_INTERACTION_SPECIFIC = "/ceRNAInteraction/findSpecific"
    static CHECKGENEINTERACTION = "/ceRNAInteraction/checkGeneInteraction"
    static FIND_CERNA = "/findceRNA"
    static GENE_COUNT = "/getGeneCount"

    static MIRNA_INTERACTION_SPECIFIC = "/miRNAInteraction/findSpecific"
    static MIRNA_INTERACTION_FIND_CERNA = "/miRNAInteraction/findceRNA"
    // static MIRNA_INTERACTION_OCCURENCE = "/miRNAInteraction/getOccurence"

    static DATASETS = "/dataset"
    static DATASET_INFORMATION = "/dataset/runInformation"

    static EXPRESSION_VALUE_CERNA = "/exprValue/getceRNA"
    // static EXPRESSION_VALUE_MIRNA = "/exprValue/getmirNA"

    static STRING_SEARCH = "/stringSearch"

    static SURVIVAL_ANALYSIS_PVALUE ="/survivalAnalysis/getPValues"
    static SURVIVAL_ANALYSIS_RATES  = "/survivalAnalysis/getRates"
    static SURVIVAL_ANALYSIS_SAMPLEINFO  = "/survivalAnalysis/sampleInformation"

    static OVERALL_COUNTS = "/getOverallCounts"
    static GENE_ONTOLOGY = "/getGeneOntology"
    static HALLMARKS="/getHallmark"

    public search_string(
        config: {
            searchString: string,
            callback: (response) => any,
            error?: (response) => any
        })
        {
            let request = Controller.API_ENDPOINT+Controller.STRING_SEARCH
            if (Object.keys(config).length > 1) {
                request += '?'
            }
            
            request += "searchString="+config.searchString
            console.log(request)
            $.getJSON(request,
                response => {
                    return config.callback(response)
                }
            ).fail(
                response => {
                    return config.error(response)
                })
            }

    public gene_count(
        config: {
            disease_name?: string,
            ensg_number?: string[],
            gene_symbol?: string[], 
            minCountAll?: number,
            minCountSign?: number,
            callback: (response) => any,
            error?: (response) => any
        })
        {
            let request = Controller.API_ENDPOINT+Controller.GENE_COUNT
            if (Object.keys(config).length > 1) {
                request += '?'
            }
            if (config.disease_name != undefined) {
                request += "&disease_name="+config.disease_name
            }
            if (config.ensg_number != undefined) {
                request += "&ensg_number="+config.ensg_number
            }
            if (config.gene_symbol != undefined) {
                request += "&gene_symbol="+config.gene_symbol
            }
            if (config.minCountAll != undefined) {
                request += "&minCountAll="+config.minCountAll
            }
            if (config.minCountSign != undefined) {
                request += "&minCountSign="+config.minCountSign
            }
            console.log(request)
            $.getJSON(request,
                response => {
                    return config.callback(response)
                }
            ).fail(
                response => {
                    return config.error(response)
                })
            }

    public check_gene_interaction(
        config: {
            ensg_number?: string[],
            gene_symbol?: string[],
            callback: (response) => any,
            error?: (response) => any
        })
        {
            let request = Controller.API_ENDPOINT+Controller.CHECKGENEINTERACTION
            if (Object.keys(config).length > 1) {
                request += '?'
            }
            if (config.ensg_number != undefined) {
                request += "&ensg_number="+config.ensg_number
            }
            if (config.gene_symbol != undefined) {
                request += "&gene_symbol="+config.gene_symbol
            }
            console.log(request)
            $.getJSON(request,
                response => {
                    return config.callback(response)
                }
            ).fail(
                response => {
                    return config.error(response)
                })
            }

    public get_miRNA_by_ceRNA(
        config: {
            disease_name?: string,
            ensg_number?: string[],
            gene_symbol?: string[],
            between: boolean,
            callback: (response) => any,
            error?: (response) => any
        })
        {
            let request = Controller.API_ENDPOINT+Controller.MIRNA_INTERACTION_FIND_CERNA
            if (Object.keys(config).length > 1) {
                request += '?'
            }
            if (config.disease_name != undefined) {
                request += "&disease_name="+config.disease_name
            }
            if (config.ensg_number != undefined) {
                request += "&ensg_number="+config.ensg_number
            }
            if (config.gene_symbol != undefined) {
                request += "&gene_symbol="+config.gene_symbol
            }
            if (config.between != undefined) {
                request += "&between="+config.between
            }
            console.log(request)
            $.getJSON(request,
                response => {
                    return config.callback(response)
                }
            ).fail(
                response => {
                    return config.error(response)
                })
            }
    
    public get_miRNA_interactions_all(
        config: {
            disease_name?: string,
            mimat_number?: string[],
            hs_number?: string[],
            limit?: number,
            offset?: number,
            information?: number,
            callback: (response) => any,
            error?: (response) => any
        })
        {
            let request = Controller.API_ENDPOINT+Controller.MIRNA_INTERACTION_SPECIFIC
            if (Object.keys(config).length > 1) {
                request += '?'
            }
            if (config.disease_name != undefined) {
                request += "&disease_name="+config.disease_name
            }
            if (config.mimat_number != undefined) {
                request += "&mimat_number="+config.mimat_number
            }
            if (config.hs_number != undefined) {
                request += "&hs_number="+config.hs_number
            }
            if (config.limit != undefined) {
                request += "&limit="+config.limit
            }
            if (config.offset != undefined) {
                request += "&offset="+config.offset
            }
            if (config.information != undefined) {
                request += "&information="+config.information
            }
            console.log(request)
            $.getJSON(request,
                response => {
                    return config.callback(response)
                }
            ).fail(
                response => {
                    return config.error(response)
                })
            }

    public get_expression_ceRNA(
        config: {
            disease_name: string,
            ensg_number?: string[],
            gene_symbol?: string[],
            callback: (response) => any,
            error?: (response) => any
        })
        {
            let request = Controller.API_ENDPOINT+Controller.EXPRESSION_VALUE_CERNA
            if (Object.keys(config).length > 1) {
                request += '?'
            }
            request += "&disease_name="+config.disease_name
            if (config.ensg_number != undefined) {
                request += "&ensg_number="+config.ensg_number
            }
            if (config.gene_symbol != undefined) {
                request += "&gene_symbol="+config.gene_symbol
            }
            console.log(request)
            $.getJSON(request,
                response => {
                    return config.callback(response)
                }
            ).fail(
                response => {
                    return config.error(response)
                })
            }
 
    public get_ceRNA_interactions_all(
        config: {
            disease_name?: string,
            descending?: boolean,
            information?: boolean,
            limit?: number,
            pValue?: number,
            ensg_number?: string[],
            gene_symbol?: string[],
            offset?: number,
            callback: (response) => any,
            error?: (response) => any
        }) 
        {
            let request = Controller.API_ENDPOINT+Controller.CERNA_INTERACTION_FINDALL;
            if (Object.keys(config).length > 1) {
                request += '?'
            }
            if (config.disease_name != undefined) {
                request += "&disease_name="+config.disease_name
            }
            if (config.information != undefined) {
                request += "&information="+config.information
            }
            if (config.limit != undefined) {
                request += "&limit="+config.limit
            }
            if (config.pValue != undefined) {
                request += "&pValue="+config.pValue
            }
            if (config.ensg_number != undefined) {
                request += "&ensg_number="+config.ensg_number
            }
            if (config.gene_symbol != undefined) {
                request += "&gene_symbol="+config.gene_symbol
            }
            if (config.offset != undefined) {
                request += "&offset="+config.offset
            }
            console.log(request)
            $.getJSON(request,
                response => {
                    return config.callback(response)
                }
            ).fail(
                response => {
                    return config.error(response)
                })
            }

    public get_ceRNA_interactions_specific(
        config: {
            disease_name?: string, 
            gene_symbol?: string[],
            offset?: number,
            ensg_number?: string[],
            limit?: number,
            pValue?: number,
            pValueDirection?: string,
            callback: (response) => any,
            error?: (response) => any
        })
        {
            let request = Controller.API_ENDPOINT+Controller.CERNA_INTERACTION_SPECIFIC
            if (Object.keys(config).length > 1) {
                request += '?'
            }
            if (config.disease_name != undefined) {
                request += "&disease_name="+config.disease_name
            }
            if (config.gene_symbol != undefined) {
                request += "&gene_symbol="+config.gene_symbol
            }
            if (config.offset != undefined) {
                request += "&offset="+config.offset
            }
            if (config.ensg_number != undefined) {
                request += "&ensg_number="+config.ensg_number
            }
            if (config.limit != undefined) {
                request += "&limit="+config.limit
            }
            if (config.pValue != undefined) {
                request += "&pValue="+config.pValue
            }
            if (config.pValueDirection != undefined) {
                request += "&pValueDirection="+config.pValueDirection
            }
            console.log(request)
            $.getJSON(request,
                response => {
                    return config.callback(response)
                }
            ).fail(
                response => {
                    return config.error(response)
                })
            }

    public get_ceRNA(
        config: {
            disease_name : string,
            ensg_number?: string[],
            gene_symbol?: string[],
            gene_type?: string,
            minBetweenness?: number,
            minNodeDegree?: number,
            minEigenvector?: number,
            sorting?: string,
            descending?: boolean,
            limit?: number,
            offset?: number
            callback: (response) => any,
            error?: (response) => any
        }
    ){
        let request = Controller.API_ENDPOINT+Controller.FIND_CERNA
        if (Object.keys(config).length > 1) {
            request += '?'
        }
        if (config.disease_name != undefined) {
            request += "&disease_name="+config.disease_name
        }
        if (config.ensg_number != undefined) {
            request += "&ensg_number="+config.ensg_number
        }
        if (config.gene_symbol != undefined) {
            request += "&gene_symbol="+config.gene_symbol
        }
        if (config.gene_type != undefined) {
            request += "&gene_type="+config.gene_type
        }
        if (config.minBetweenness != undefined) {
            request += "&betweenness="+config.minBetweenness
        }
        if (config.minNodeDegree != undefined) {
            request += "&degree="+config.minNodeDegree
        }
        if (config.minEigenvector != undefined) {
            request += "&eigenvector="+config.minEigenvector
        }
        if (config.sorting != undefined) {
            request += "&sorting="+config.sorting
        }
        if (config.descending != undefined) {
            request += "&descending="+config.descending
        }
        if (config.limit != undefined) {
            request += "&limit="+config.limit
        }
        if (config.offset != undefined) {
            request += "&offset="+config.offset
        }
        console.log(request)
        $.getJSON(request,
            response => {
                return config.callback(response)                
            }
        ).fail(
            response => {
                return config.error(response)
            })
        }

    public get_survival_pvalue(
        config: {
            disease_name : string,
            ensg_number: string[],
            gene_symbol?: string[],
            limit?: number,
            offset?: number
            callback: (response) => any,
            error?: (response) => any
        }
    ){
        let request = Controller.API_ENDPOINT+Controller.SURVIVAL_ANALYSIS_PVALUE
        if (Object.keys(config).length > 1) {
            request += '?'
        }
        if (config.disease_name != undefined) {
            request += "&disease_name="+config.disease_name
        }
        if (config.ensg_number != undefined) {
            request += "&ensg_number="+config.ensg_number
        }
        if (config.gene_symbol != undefined) {
            request += "&gene_symbol="+config.gene_symbol
        }
        
        if (config.limit != undefined) {
            request += "&limit="+config.limit
        }
        if (config.offset != undefined) {
            request += "&offset="+config.offset
        }
        console.log(request)
        $.getJSON(request,
            response => {
                return config.callback(response)                
            }
        ).fail(
            response => {
                return config.error(response)
            })
        }

    public get_survival_rates(
        config: {
            disease_name : string,
            ensg_number: string[],
            gene_symbol?: string[],
            sample_ID?: string[],
            limit?: number,
            offset?: number
            callback: (response) => any,
            error?: (response) => any
        }
    ){
        let request = Controller.API_ENDPOINT+Controller.SURVIVAL_ANALYSIS_RATES
        if (Object.keys(config).length > 1) {
            request += '?'
        }
        if (config.disease_name != undefined) {
            request += "&disease_name="+config.disease_name
        }
        if (config.ensg_number != undefined) {
            request += "&ensg_number="+config.ensg_number
        }
        if (config.gene_symbol != undefined) {
            request += "&gene_symbol="+config.gene_symbol
        }
        if (config.sample_ID != undefined) {
            request += "&sample_ID="+config.sample_ID
        }
        
        if (config.limit != undefined) {
            request += "&limit="+config.limit
        }
        if (config.offset != undefined) {
            request += "&offset="+config.offset
        }
        console.log(request)
        $.getJSON(request,
            response => {
                return config.callback(response)                
            }
        ).fail(
            response => {
                return config.error(response)
            })
        }

    public get_survival_sampleInfo(
        config: {
            disease_name : string,
            sample_ID: string[],
            limit?: number,
            offset?: number
            callback: (response) => any,
            error?: (response) => any
        }
    ){
        let request = Controller.API_ENDPOINT+Controller.SURVIVAL_ANALYSIS_SAMPLEINFO
        if (Object.keys(config).length > 1) {
            request += '?'
        }
        if (config.disease_name != undefined) {
            request += "&disease_name="+config.disease_name
        }
        if (config.sample_ID != undefined) {
            request += "&sample_ID="+config.sample_ID
        }
        
        if (config.limit != undefined) {
            request += "&limit="+config.limit
        }
        if (config.offset != undefined) {
            request += "&offset="+config.offset
        }
        console.log(request)
        $.getJSON(request,
            response => {
                return config.callback(response)                
            }
        ).fail(
            response => {
                return config.error(response)
            })
        }
    
    public get_datasets(callback: (response) => any, disease_name?: string) {
        let request = Controller.API_ENDPOINT+Controller.DATASETS
        if (disease_name != undefined) {
            request += "?disease_name="+disease_name
        }
        console.log(request)
        $.getJSON(request,
            response => {
                return callback(response)
            }
        ).fail(function() { 
            $('#browse_loading_spinner').addClass('hidden') 
            
            $('#overlay-error').css('visibility','visible')
           })
    }

    public get_dataset_information(disease_name: string, callback: (response) => any) {
        $.getJSON(Controller.API_ENDPOINT+Controller.DATASET_INFORMATION+"?disease_name="+disease_name,
            response => {
                return callback(response)
            }
        ).fail(function() { 
            $('#browse_loading_spinner').addClass('hidden') 
            
            $('#error_overlay').css('visibility','visible')
           })
    }
    
    public get_overall_counts(
        config: {
            callback: (response) => any,
            error?: (response) => any
        })
        {
            let request = Controller.API_ENDPOINT+Controller.OVERALL_COUNTS
            console.log(request)
            $.getJSON(request,
                response => {
                    return config.callback(response)
                }
            ).fail(
                response => {
                    return config.error(response)
                })
        }

        public get_GO(
                config: {
                    gene_symbol: string[], 
                    callback: (response) => any,
                    error?: (response) => any,
                    
                })
        {
                    let request = Controller.API_ENDPOINT+Controller.GENE_ONTOLOGY
                    if (Object.keys(config).length > 1) {
                        request += '?'
                    }
                    
                    if (config.gene_symbol != undefined) {
                        request += "&gene_symbol="+config.gene_symbol
                    }
                    console.log(request)
     
                    $.getJSON(request,
                        response => {
                            if(response.status != "202"){
                          //  return config.callback(response)
                            }
                        }
                    ).then(res =>{
                        if(res.status != "202"){
                            return config.callback(res)
                            }
                    }).fail(
                        res => {
                            return config.callback(res)
                        })    
                    
        }

        public get_GO_Promis(
            config: {
                gene_symbol: string[],         
                
            })
    {
        return new Promise((resolve, rejects) => {
            let request = Controller.API_ENDPOINT+Controller.GENE_ONTOLOGY
           // if (Object.keys(config).length > 1) {
                request += '?gene_symbol='+config.gene_symbol
            //}else if
            
           //  (config.gene_symbol != undefined) {
            //    request += "&gene_symbol="+config.gene_symbol
          //  }
            console.log(request)

            $.getJSON(request,
                response => {
                    if(response.status != "202"){
                    return resolve(response)
                    }
                }
            ).fail(
                res => {
                    return rejects(res)
                })    
        })
                
                
    }

      
        

        public get_Hallmark(
            config: {
                gene_symbol: string[], 
                callback: (response) => any,
                error?: (response) => any
            })
            {
                let request = Controller.API_ENDPOINT+Controller.HALLMARKS
                if (Object.keys(config).length > 1) {
                    request += '?'
                }
                
                if (config.gene_symbol != undefined) {
                    request += "&gene_symbol="+config.gene_symbol
                }
                //console.log(request)
                $.getJSON(request,
                    response => {
                        return config.callback(response)
                    }
                ).fail(function()
                      {
                       
                        return config.error("No hallmark associated")
                        
                    })
                                
                }

                   
}