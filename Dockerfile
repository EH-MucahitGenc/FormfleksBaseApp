# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY FormfleksBaseApp.Api/FormfleksBaseApp.Api.csproj FormfleksBaseApp.Api/
COPY FormfleksBaseApp.Application/FormfleksBaseApp.Application.csproj FormfleksBaseApp.Application/
COPY FormfleksBaseApp.Infrastructure/FormfleksBaseApp.Infrastructure.csproj FormfleksBaseApp.Infrastructure/
COPY FormfleksBaseApp.Domain/FormfleksBaseApp.Domain.csproj FormfleksBaseApp.Domain/

RUN dotnet restore FormfleksBaseApp.Api/FormfleksBaseApp.Api.csproj

COPY . .
RUN dotnet publish FormfleksBaseApp.Api/FormfleksBaseApp.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Development
EXPOSE 8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "FormfleksBaseApp.Api.dll"]
