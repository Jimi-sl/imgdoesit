class Bank{

    private balance: number[];

     constructor(balance: number[]){

        this.balance = balance;     

    }

    transfer(account1: number, account2: number, money: number): boolean {
        try{
            if (this.balance[account1] >= money) {
                this.balance[account1] -= money;
                this.balance[account2] += money;
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error occurred while transferring funds:", error);
            return false;
        }
    }

    deposit(account: number, money: number): boolean {
        try {
            this.balance[account] += money;
            return true;
        } catch (error) {
            console.error("Error occurred while depositing funds:", error);
            return false;
        }   
    }

    withdraw(account: number, money: number): boolean {
        try {
            if (this.balance[account] >= money) {
                this.balance[account] -= money;
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error occurred while withdrawing funds:", error);
            return false;
        }
    }

}

const bank = new Bank([10, 100, 20, 50, 30]);
bank.withdraw(3, 10);    // true — account 3 has $20, withdraw $10 → $10
bank.transfer(5, 1, 20); // true — account 5: $30→$10, account 1: $10→$30
bank.deposit(5, 20);     // true — account 5: $10→$30
bank.transfer(3, 4, 15); // false — account 3 only has $10
bank.withdraw(10, 50);   // false — account 10 does not exist