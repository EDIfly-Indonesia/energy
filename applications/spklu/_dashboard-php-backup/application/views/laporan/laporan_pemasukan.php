<style>

#right{float:right}

.right {
                text-align: right;
            }
			.center {
                text-align: center;
            }
</style>

<div class="msg" style="display:none;">
  <?php  echo @$this->session->flashdata('msg'); ?>
</div>

<div class="box">
  
  <!-- /.box-header -->
  <div class="box-body">
  
   
  
   <div class="form-group row">
                    <label for="" class="col-md-2 col-form-label">Bulan</label>
                    <div class="col-md-2">
                        <select name="txtbulan" id="txtbulan" class="form-control" data-placeholder="Pilih Bulan" onchange="getdata()" required>
                          
                           
                        </select>
                    </div>
					 <label for="" class="col-md-2 col-form-label">Tahun</label>
                    <div class="col-md-2">
                        <select name="txttahun" id="txttahun" class="form-control" data-placeholder="Pilih Tahun" onchange="getdata()" required>
                          
                           
                        </select>
                    </div>
                </div>

	  <div class="table-responsive" style="min-height: 500px;">
	  	
    <br><table id="list-data" class="table table-bordered table-striped">
      <thead>
        <tr>
          
          <th>Mitra</th>
		  <th>Toko</th>
		  <th>Waktu</th>
          <th>Jumlah</th>
		   
		   
         
        </tr>
      </thead>
     <tfoot align="right">
		<tr><th></th><th></th><th></th><th></th></tr>
	</tfoot>
    </table>
	</div>
  </div>
</div>

 
  

<div id="tempat-modal"></div>

<script type="text/javascript">
var _idubah=0;
var statuslaundry=-1;
var statusbayar=-1;
var bulan=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    $(document).ready(function() {
		 var html = "";
		var ket="";
		const d = new Date();
		let month = d.getMonth()+1;
		let year = d.getFullYear();
		
							for(i=1; i<=12; i++){
								
								if(i==month) ket="selected";
								
								
                            html += '<option value='+i+' '+ ket +'>'+bulan[(i-1)]+'</option>';
							ket="";
							
							
						
						}
					
		
		$('#txtbulan').html(html);
		html="";
		for(i=2021; i<=2100; i++){
								
								if(i==year) ket="selected";
								
								
                            html += '<option value='+i+' '+ ket +'>'+i+'</option>';
							ket="";
							
							
						
						}	
			$('#txttahun').html(html);
		
		getdata();
	});
	
	
	
	
	
	
	function getdata(){
		
		var _bulan=$('#txtbulan').val();
		var _tahun=$('#txttahun').val();
		var datatable=   $('#list-data').DataTable( {
      dom: 'Blfrtip',
        buttons: [
            { extend: 'copy', footer: true },
            { extend: 'excel', footer: true },
            { extend: 'pdf', footer: true },
            { extend: 'csv', footer: true }
      
        
    ],
    
     
 "processing" : true,
 "footerCallback": function ( row, data, start, end, display ) {
            var api = this.api(), data;
 
            // converting to interger to find total
            var intVal = function ( i ) {
                return typeof i === 'string' ?
                    i.replace(/[\$,]/g, '')*1 :
                    typeof i === 'number' ?
                        i : 0;
            };
 
            // computing column Total of the complete result 
            var monTotal = api
                .column( 3 )
                .data()
                .reduce( function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0 );
                
              
	   
				
            // Update footer by showing the total with the reference of the column index 
	        $( api.column( 0 ).footer() ).html('Total');
          
            $( api.column( 3 ).footer() ).html(monTotal.toLocaleString('en-US'));
           
         
        },
  "oLanguage": {
                "sLengthMenu": "Tampilkan _MENU_ data per halaman",
                "sSearch": "Pencarian: ",
                "sZeroRecords": "Maaf, tidak ada data yang ditemukan",
               "sInfo": "Menampilkan _START_ s/d _END_ dari _TOTAL_ data",
				//"sInfo": "",
                "sInfoEmpty": "Menampilkan 0 s/d 0 dari 0 data",
                "sInfoFiltered": "(di filter dari _MAX_ total data)",
                "oPaginate": {
                    "sFirst": "<<",
                    "sLast": ">>",
                    "sPrevious": "<",
                    "sNext": ">"
               }
            },
  columnDefs: [{
        targets: [0],
        orderable: false
     },
	
	 {targets: [-1],
         className: 'right'
     },
// 	  {targets: [-1,-2],
//          visible: false
//      },
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    
 
  "ajax":{
          url :"<?php echo base_url('laporan/pemasukanjson'); ?>", // json datasource
          type: "post",
		    data : {bulan:_bulan,tahun:_tahun},
			  // method  , by default get
          
        },
		
		"columns": [
			
			{ "data": "owner_name"},
			{ "data": "shop_name"},
			{ "data": "tanggal"},
			{ "data": "jumlah"},
			
			
		]
  
  });
 
	}
	

</script>
