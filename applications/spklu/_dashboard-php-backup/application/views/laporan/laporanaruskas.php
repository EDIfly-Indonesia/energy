<style>
.table th {
  text-align: center;
}
#right{float:right}
table.dataTable tfoot th {
    text-align: right;
}
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
            <div class="col-md-6">
                  <div class="form-group row">
      <label for="" class="col-md-3">Toko</label>
                    <div class="col-md-4">
  <select name="txtshop" id="txtshop" class="form-control" data-placeholder="Pilih Toko" onchange="getdata(this.value);" required>
                           <option value="0">Semua</option>
                          <?php foreach($daftartoko as $u):?>
                                <option value="<?php echo $u->id?>"><?php echo $u->namatoko?></option>
                            <?php endforeach;?>
                        </select>
                        </div>
                         </div>
   </div>
   </div>
   <div class="form-group row">
   
    <div class="col-md-6">
         <div class="form-group row">
            <label class="col-md-3"><input type="radio" name="optjeniswaktu" value="1">&nbsp; Bulanan</label>
                    
                     <div class="col-md-4">
                       <select name="txtbulan" id="txtbulan" class="form-control" data-placeholder="Pilih Bulan" onchange="getdata()" required>
                          
                           
                        </select>
                    </div>
                    
                    <div class="col-md-4">
                      <select name="txttahun" id="txttahun" class="form-control" data-placeholder="Pilih Tahun" onchange="getdata()" required>-->
                          
                           
                      </select>
                    </div>
                    
                </div>
    </div>
  
   <div class="col-md-6">
         <div class="form-group row">
            <label class="col-md-2"><input type="radio" name="optjeniswaktu" value="0">&nbsp; Harian</label>
                    
                     <div class="col-md-3">
                      <input type="date" id="tgl1" name="tgl1" value="<?php echo date('Y-m-d'); ?>">
                    </div>
                   <div class="col-md-1">sd
                       </div>
                    <div class="col-md-3">
                      <input type="date" id="tgl2" name="tgl2" value="<?php echo date('Y-m-d'); ?>">
                    </div>
                    <div class="col-md-3"><button type="button" class="btn btn-primary" onclick="getdata();";>Lihat</button>
                       </div>
                </div>
    </div>
    </div>
  

	  <div class="table-responsive" style="min-height: 500px;">
	  	
    <br><table id="list-data" class="table table-bordered table-striped">
      <thead>
        <tr>
           <th>Toko</th>
          <th>Tanggal</th>
          <th>Keterangan</th>
          <th>Pemasukan</th>
		  <th>Pengeluaran</th>
		  
        <th></th>
        </tr>
      </thead>
     <tfoot align="right">
		<tr><th></th><th></th><th></th><th></th><th></th></tr>
	</tfoot>
    </table>
	</div>
  </div>
</div>

 
  

<div id="tempat-modal"></div>

<script type="text/javascript">

var vjeniswaktu=1;
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
						
						html = "";
						for(i=2021; i<=2100; i++){
								
								if(i==year) ket="selected";
								
								
                            html += '<option value='+i+' '+ ket +'>'+i+'</option>';
							ket="";
							
							
						
						}	
			$('#txttahun').html(html);
			document.querySelector("input[value='"+vjeniswaktu+"']").checked = true;
		getdata();
	});
	
	
	
	$('input:radio[name="optjeniswaktu"]').change(
    function(){
        if ($(this).is(':checked')) {
			vjeniswaktu=$(this).val();
		if(vjeniswaktu==1)	getdata();
        }
    });

	
	
	function getdata(){
		var _tanggal1=$('#tgl1').val();
		var _tanggal2=$('#tgl2').val();
		var _toko=$('#txtshop').val();
		var _bulan=$('#txtbulan').val();
		var _tahun=$('#txttahun').val();
	


		
		var datatable=   $('#list-data').DataTable( {
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
            var monpemasukan = api
                .column( 3 )
                .data()
                .reduce( function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0 );
                
                 var monpengeluaran = api
                .column( 4 )
                .data()
                .reduce( function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0 );
				
	   
				
            // Update footer by showing the total with the reference of the column index 
	        $( api.column( 0 ).footer() ).html('Total');
            $( api.column( 3 ).footer() ).html(monpemasukan.toLocaleString('en-US'));
            $( api.column( 4 ).footer() ).html(monpengeluaran.toLocaleString('en-US'));
           
         
        },
       dom: 'Blfrtip',
        buttons: [
            { extend: 'copy', footer: true,
				exportOptions: {
                    columns: [0,1,2,3,4  ]
                }				},
            { extend: 'excel', footer: true,
			filename : "aruskas",
				exportOptions: {
                    columns: [ 0,1,2,3,4 ]
                }			},
            { extend: 'pdf', footer: true,
			filename : "aruskas",
				exportOptions: {
                    columns: [ 0,1,2,3,4  ]
                }				},
            { extend: 'csv', footer: true ,
			filename : "aruskas",
				exportOptions: {
                    columns: [ 0,1,2,3,4]
                }	
			}
      
        
    ],
     "processing" : true,
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
	
	 {targets: [-2,-3],
         className: 'right'
     },
   
	 {targets: [-1],
         visible: false
     },
      {targets:  [-3,-2],
                    render: function ( data, type, row ) {
                     
                      if (parseInt(data)==0) {
                        return "";
                      } 
                     else  
                      return data;
                    }
               }
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    "order": [5,'desc'],
 
  "ajax":{
          url :"<?php echo base_url('laporan/aruskasjson'); ?>", // json datasource
          type: "post",
		    data : {shop_id: _toko,
		        jeniswaktu: vjeniswaktu,
		        tanggal1: _tanggal1,
		        tanggal2: _tanggal2,
		        bulan: _bulan,
		        tahun: _tahun,
		        
		    },
			  // method  , by default get
          
        },
		
		"columns": [
			
			{ "data": "namatoko"},
		    { "data": "tanggal"},
			{ "data": "keterangan"},
		    { "data": "pemasukan"},
		    { "data": "pengeluaran"},
			{ "data": "id"}
			
		]
  
  });
 
	}

	
</script>
