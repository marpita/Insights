# Turn on a case-insensitive matching (-s set nocasematch)
opt=$1
action=$2
echo "$opt"
case $opt in
        [lL][Ii][nN][uU][Xx])
          case $action in 
            [uU][nN][iI][nN][sS][tT][aA][lL][lL])
	          	sudo service InSightsCircleciAgent stop
				sudo rm -R /etc/init.d/InSightsCircleciAgent
				echo "Service un-installation step completed"
		        ;;
		    *)
                echo "Circleci Running on Linux..."
				sudo cp -xp InSightsCircleciAgent.sh  /etc/init.d/InSightsCircleciAgent
				sudo chmod +x /etc/init.d/InSightsCircleciAgent
				sudo chkconfig InSightsCircleciAgent on
				sudo service  InSightsCircleciAgent status
				sudo service  InSightsCircleciAgent stop
				sudo service  InSightsCircleciAgent status
				sudo service  InSightsCircleciAgent start
				sudo service  InSightsCircleciAgent status
				echo "Service installaton steps completed"
                ;;
		  esac
		  ;;
        [uU][bB][uU][nN][tT][uU])
	      case $action in 
            [uU][nN][iI][nN][sS][tT][aA][lL][lL]) 
				sudo systemctl stop InSightsCircleciAgent
				sudo rm -R /etc/systemd/system/InSightsCircleciAgent.service
				echo "Service un-installation step completed"				
			    ;;
			*)
                echo "Circleci Running on Ubuntu..."
				sudo cp -xp InSightsCircleciAgent.service /etc/systemd/system
				sudo systemctl enable InSightsCircleciAgent
				sudo systemctl start InSightsCircleciAgent
				echo "Service installaton steps completed"
                ;;
		  esac
		  ;;
        centos)
                echo "Circleci Running on centso..."
                ;;
        *)
        	    echo "Please provide correct OS input"
esac