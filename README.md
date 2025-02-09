# health-center-azure-functions

This project as deployed as Azure Function App with 2 functions for Health Center application:

- timer trigger: a kepp-alive query to SQL Database resource every 15min between 7am and midnight daily;
- http trigger: accepts POST request from application client and calls Azure OpenAi resource with gpt-35-turbo AI model deployment;

```
request body: 

    {message: "..."}
```


### Application

- [client repo](https://github.com/microieva/app-fe)
- [server repo](https://github.com/microieva/app-be)